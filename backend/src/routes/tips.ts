/**
 * Community Tips Routes
 * CRUD + voting + flagging for community shopping tips
 * Mirrors the recipes route pattern
 */

import express, { Request, Response } from 'express';
import https from 'https';
import pool from '../config/database';

const router = express.Router();

const GITHUB_REPO = process.env.GITHUB_FEEDBACK_REPO || '';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';

/**
 * GET /api/v1/tips
 * List community tips with pagination, filtering, and sorting
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { category } = req.query;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = parseInt(req.query.offset as string) || 0;

    let query = `
      SELECT id, title, content, category, tags, submitted_by, status,
             upvotes, downvotes, net_score, flag_count, created_at
      FROM community_tips
      WHERE status = 'active'
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (category && typeof category === 'string' && category !== 'all') {
      query += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    // Count total
    const countQuery = query.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) as total FROM');
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0]?.total || '0');

    // Sort by net_score DESC, then newest
    query += ' ORDER BY net_score DESC, created_at DESC';

    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    const tips = result.rows.map(formatTip);

    res.json({
      success: true,
      tips,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    });
  } catch (error) {
    console.error('Error fetching community tips:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch tips' });
  }
});

/**
 * POST /api/v1/tips
 * Submit a new community tip
 * Rate limit: 5 tips/hour per submitted_by
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { title, content, category, tags, submittedBy } = req.body;

    // Validate required fields
    if (!title || !content || !category) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: title, content, category',
      });
    }

    if (title.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Title must be 100 characters or less',
      });
    }

    if (content.length > 500) {
      return res.status(400).json({
        success: false,
        error: 'Content must be 500 characters or less',
      });
    }

    const author = submittedBy || 'anonymous';

    // Rate limit: 5 tips/hour per submitter
    if (author !== 'anonymous') {
      const rateCheck = await pool.query(
        `SELECT COUNT(*) as count FROM community_tips
         WHERE submitted_by = $1 AND created_at > NOW() - INTERVAL '1 hour'`,
        [author]
      );
      if (parseInt(rateCheck.rows[0].count) >= 5) {
        return res.status(429).json({
          success: false,
          error: 'Rate limit exceeded. Maximum 5 tips per hour.',
        });
      }
    }

    const result = await pool.query(
      `INSERT INTO community_tips (title, content, category, tags, submitted_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [title, content, category, tags || [], author]
    );

    res.status(201).json({ success: true, tip: formatTip(result.rows[0]) });
  } catch (error) {
    console.error('Error creating community tip:', error);
    res.status(500).json({ success: false, error: 'Failed to create tip' });
  }
});

/**
 * POST /api/v1/tips/:id/vote
 * Vote on a community tip (up or down)
 */
router.post('/:id/vote', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { voteType, voterId } = req.body;

    if (!voteType || !['up', 'down'].includes(voteType)) {
      return res.status(400).json({ success: false, error: 'voteType must be "up" or "down"' });
    }

    const recipientId = voterId || 'anonymous';

    // Check if already voted
    const existing = await pool.query(
      'SELECT id, vote_type FROM community_tip_votes WHERE tip_id = $1 AND voter_id = $2',
      [id, recipientId]
    );

    if (existing.rows.length > 0) {
      const oldVote = existing.rows[0].vote_type;

      if (oldVote === voteType) {
        // Remove vote (toggle off)
        await pool.query('DELETE FROM community_tip_votes WHERE id = $1', [existing.rows[0].id]);

        const scoreChange = voteType === 'up' ? -1 : 1;
        const column = voteType === 'up' ? 'upvotes' : 'downvotes';
        await pool.query(
          `UPDATE community_tips SET ${column} = GREATEST(${column} - 1, 0), net_score = net_score + $1 WHERE id = $2`,
          [scoreChange, id]
        );

        return res.json({ success: true, action: 'removed', voteType: null });
      } else {
        // Change vote
        await pool.query(
          'UPDATE community_tip_votes SET vote_type = $1 WHERE id = $2',
          [voteType, existing.rows[0].id]
        );

        const upChange = voteType === 'up' ? 1 : -1;
        await pool.query(
          `UPDATE community_tips SET upvotes = upvotes + $1, downvotes = downvotes - $1, net_score = net_score + $2 WHERE id = $3`,
          [upChange, upChange * 2, id]
        );

        return res.json({ success: true, action: 'changed', voteType });
      }
    }

    // New vote
    await pool.query(
      'INSERT INTO community_tip_votes (tip_id, voter_id, vote_type) VALUES ($1, $2, $3)',
      [id, recipientId, voteType]
    );

    const column = voteType === 'up' ? 'upvotes' : 'downvotes';
    const scoreChange = voteType === 'up' ? 1 : -1;
    await pool.query(
      `UPDATE community_tips SET ${column} = ${column} + 1, net_score = net_score + $1 WHERE id = $2`,
      [scoreChange, id]
    );

    // Auto-moderation: hide if net score drops to -3
    const tipResult = await pool.query(
      `SELECT status, net_score, title, content, flag_count FROM community_tips WHERE id = $1`,
      [id]
    );

    if (tipResult.rows.length > 0) {
      const tip = tipResult.rows[0];
      if (tip.net_score <= -3 && tip.status === 'active') {
        await pool.query(
          `UPDATE community_tips SET status = 'hidden' WHERE id = $1`,
          [id]
        );
        // Create GitHub issue for moderation
        createModerationIssue(id, tip.title, tip.content, tip.flag_count, tip.net_score, ['Auto-hidden: net_score dropped below -3']);
      }
    }

    res.json({ success: true, action: 'voted', voteType });
  } catch (error) {
    console.error('Error voting on community tip:', error);
    res.status(500).json({ success: false, error: 'Failed to vote on tip' });
  }
});

/**
 * POST /api/v1/tips/:id/flag
 * Flag a community tip for moderation
 */
router.post('/:id/flag', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason, flaggerId: rawFlaggerId } = req.body;

    const flaggerId = rawFlaggerId || 'anonymous';

    // Check if already flagged by this user
    const existing = await pool.query(
      'SELECT id FROM community_tip_flags WHERE tip_id = $1 AND flagger_id = $2',
      [id, flaggerId]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, error: 'Already flagged this tip' });
    }

    await pool.query(
      'INSERT INTO community_tip_flags (tip_id, flagger_id, reason) VALUES ($1, $2, $3)',
      [id, flaggerId, reason || null]
    );

    await pool.query(
      'UPDATE community_tips SET flag_count = flag_count + 1 WHERE id = $1',
      [id]
    );

    // Auto-moderation: flag after 3 flags
    const tipResult = await pool.query(
      `SELECT status, title, content, flag_count, net_score FROM community_tips WHERE id = $1`,
      [id]
    );

    if (tipResult.rows.length > 0) {
      const tip = tipResult.rows[0];
      if (tip.flag_count >= 3 && tip.status === 'active') {
        await pool.query(
          `UPDATE community_tips SET status = 'flagged' WHERE id = $1`,
          [id]
        );

        // Collect flag reasons for the GitHub issue
        const flagsResult = await pool.query(
          'SELECT reason FROM community_tip_flags WHERE tip_id = $1 AND reason IS NOT NULL',
          [id]
        );
        const reasons = flagsResult.rows.map((r: any) => r.reason);

        createModerationIssue(id, tip.title, tip.content, tip.flag_count, tip.net_score, reasons);
      }
    }

    res.json({ success: true, message: 'Tip flagged for review' });
  } catch (error) {
    console.error('Error flagging community tip:', error);
    res.status(500).json({ success: false, error: 'Failed to flag tip' });
  }
});

/**
 * GET /api/v1/tips/flagged
 * Admin endpoint: return all flagged tips for moderation review
 */
router.get('/flagged', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, title, content, category, tags, submitted_by, status,
              upvotes, downvotes, net_score, flag_count, created_at
       FROM community_tips
       WHERE status = 'flagged'
       ORDER BY flag_count DESC, created_at DESC`
    );

    res.json({ success: true, tips: result.rows.map(formatTip) });
  } catch (error) {
    console.error('Error fetching flagged tips:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch flagged tips' });
  }
});

/**
 * POST /api/v1/tips/:id/moderate
 * Admin endpoint: moderate a flagged tip
 */
router.post('/:id/moderate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { action } = req.body;

    if (!action || !['approve', 'hide', 'delete'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'action must be "approve", "hide", or "delete"',
      });
    }

    let newStatus: string;
    switch (action) {
      case 'approve':
        newStatus = 'active';
        break;
      case 'hide':
        newStatus = 'hidden';
        break;
      case 'delete':
        newStatus = 'deleted';
        break;
      default:
        newStatus = 'hidden';
    }

    await pool.query(
      'UPDATE community_tips SET status = $1 WHERE id = $2',
      [newStatus, id]
    );

    // If approved, reset flag count
    if (action === 'approve') {
      await pool.query(
        'UPDATE community_tips SET flag_count = 0 WHERE id = $1',
        [id]
      );
    }

    res.json({ success: true, message: `Tip ${action}d successfully`, status: newStatus });
  } catch (error) {
    console.error('Error moderating community tip:', error);
    res.status(500).json({ success: false, error: 'Failed to moderate tip' });
  }
});

/**
 * Create a GitHub issue for moderation when auto-moderation thresholds are crossed
 */
function createModerationIssue(
  tipId: string | number,
  title: string,
  content: string,
  flagCount: number,
  netScore: number,
  reasons: string[]
): void {
  if (!GITHUB_REPO || !GITHUB_TOKEN) {
    console.warn('GitHub not configured — skipping moderation issue creation');
    return;
  }

  const issueTitle = `[Moderation] Community tip #${tipId} flagged for review`;

  let body = `## Flagged Community Tip\n\n`;
  body += `**Tip ID:** ${tipId}\n`;
  body += `**Title:** ${title}\n`;
  body += `**Content:** ${content}\n\n`;
  body += `**Flag Count:** ${flagCount}\n`;
  body += `**Net Score:** ${netScore}\n`;
  body += `**Flagged At:** ${new Date().toISOString()}\n\n`;

  if (reasons.length > 0) {
    body += `### Flag Reasons\n\n`;
    reasons.forEach((r, i) => {
      body += `${i + 1}. ${r}\n`;
    });
  }

  body += `\n---\n\n`;
  body += `**Action required:** Review this tip and moderate via the admin API:\n`;
  body += `- Approve: \`POST /api/v1/tips/${tipId}/moderate\` with \`{"action":"approve"}\`\n`;
  body += `- Hide: \`POST /api/v1/tips/${tipId}/moderate\` with \`{"action":"hide"}\`\n`;
  body += `- Delete: \`POST /api/v1/tips/${tipId}/moderate\` with \`{"action":"delete"}\`\n`;

  const postData = JSON.stringify({ title: issueTitle, body, labels: ['moderation'] });

  const options = {
    hostname: 'api.github.com',
    path: `/repos/${GITHUB_REPO}/issues`,
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'WIC-Benefits-App',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  };

  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => (data += chunk));
    res.on('end', () => {
      if (res.statusCode === 201) {
        console.log(`Moderation issue created for tip #${tipId}`);
      } else {
        console.error(`Failed to create moderation issue: ${res.statusCode} ${data}`);
      }
    });
  });

  req.on('error', (err) => {
    console.error('Failed to create moderation GitHub issue:', err.message);
  });

  req.write(postData);
  req.end();
}

function formatTip(row: any) {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    category: row.category,
    tags: row.tags || [],
    submittedBy: row.submitted_by,
    status: row.status,
    upvotes: row.upvotes,
    downvotes: row.downvotes,
    netScore: row.net_score,
    flagCount: row.flag_count,
    createdAt: row.created_at,
  };
}

export default router;
