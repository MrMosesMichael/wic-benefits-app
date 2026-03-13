/**
 * Recipes Routes
 * CRUD + voting + flagging for community recipes
 */

import express, { Request, Response } from 'express';
import https from 'https';
import pool from '../config/database';

const router = express.Router();

const GITHUB_REPO = process.env.GITHUB_FEEDBACK_REPO || '';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';

/**
 * GET /api/v1/recipes
 * List recipes with pagination, filtering, and sorting
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      category,
      search,
      sort = 'newest',
      source,
    } = req.query;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = parseInt(req.query.offset as string) || 0;

    let query = `
      SELECT id, title, title_es, category, prep_time_minutes, servings,
             difficulty, wic_ingredients, non_wic_ingredients, instructions,
             submitted_by, is_bundled, status, upvotes, downvotes, net_score,
             flag_count, created_at, updated_at
      FROM recipes
      WHERE status = 'active'
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (category && typeof category === 'string' && category !== 'all') {
      query += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (source === 'community') {
      query += ` AND is_bundled = FALSE`;
    } else if (source === 'bundled') {
      query += ` AND is_bundled = TRUE`;
    }

    if (search && typeof search === 'string') {
      query += ` AND (title ILIKE $${paramIndex} OR title_es ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Count total
    const countQuery = query.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) as total FROM');
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0]?.total || '0');

    // Sort
    switch (sort) {
      case 'popular':
        query += ' ORDER BY net_score DESC, created_at DESC';
        break;
      case 'oldest':
        query += ' ORDER BY created_at ASC';
        break;
      case 'newest':
      default:
        query += ' ORDER BY created_at DESC';
        break;
    }

    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    const recipes = result.rows.map(formatRecipe);

    res.json({
      success: true,
      recipes,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    });
  } catch (error) {
    console.error('Error fetching recipes:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch recipes' });
  }
});

/**
 * GET /api/v1/recipes/pending
 * Admin endpoint: list pending recipes awaiting moderation
 */
router.get('/pending', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, title, title_es, category, prep_time_minutes, servings,
              difficulty, wic_ingredients, non_wic_ingredients, instructions,
              submitted_by, is_bundled, status, upvotes, downvotes, net_score,
              flag_count, created_at, updated_at
       FROM recipes
       WHERE status = 'pending'
       ORDER BY created_at DESC`
    );

    res.json({ success: true, recipes: result.rows.map(formatRecipe) });
  } catch (error) {
    console.error('Error fetching pending recipes:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch pending recipes' });
  }
});

/**
 * GET /api/v1/recipes/:id
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT * FROM recipes WHERE id = $1 AND status = 'active'`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Recipe not found' });
    }

    res.json({ success: true, recipe: formatRecipe(result.rows[0]) });
  } catch (error) {
    console.error('Error fetching recipe:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch recipe' });
  }
});

/**
 * POST /api/v1/recipes
 * Submit a new recipe
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      title,
      titleEs,
      category,
      prepTime,
      servings,
      difficulty,
      wicIngredients,
      nonWicIngredients,
      instructions,
      submittedBy,
    } = req.body;

    // Validate required fields
    if (!title || !category || !prepTime || !servings || !difficulty || !wicIngredients || !instructions) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: title, category, prepTime, servings, difficulty, wicIngredients, instructions',
      });
    }

    const result = await pool.query(
      `INSERT INTO recipes (
        title, title_es, category, prep_time_minutes, servings, difficulty,
        wic_ingredients, non_wic_ingredients, instructions, submitted_by, is_bundled, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, FALSE, 'pending')
      RETURNING *`,
      [
        title,
        titleEs || null,
        category,
        prepTime,
        servings,
        difficulty,
        JSON.stringify(wicIngredients),
        JSON.stringify(nonWicIngredients || []),
        JSON.stringify(instructions),
        submittedBy || 'anonymous',
      ]
    );

    const recipe = formatRecipe(result.rows[0]);

    // Create GitHub issue for recipe review
    createRecipeReviewIssue(
      recipe.id,
      title,
      category,
      wicIngredients,
      nonWicIngredients || [],
      instructions,
      submittedBy || 'anonymous'
    );

    res.status(201).json({ success: true, recipe });
  } catch (error) {
    console.error('Error creating recipe:', error);
    res.status(500).json({ success: false, error: 'Failed to create recipe' });
  }
});

/**
 * POST /api/v1/recipes/:id/vote
 * Vote on a recipe (up or down)
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
      'SELECT id, vote_type FROM recipe_votes WHERE recipe_id = $1 AND voter_id = $2',
      [id, recipientId]
    );

    if (existing.rows.length > 0) {
      const oldVote = existing.rows[0].vote_type;

      if (oldVote === voteType) {
        // Remove vote (toggle off)
        await pool.query('DELETE FROM recipe_votes WHERE id = $1', [existing.rows[0].id]);

        const scoreChange = voteType === 'up' ? -1 : 1;
        const column = voteType === 'up' ? 'upvotes' : 'downvotes';
        await pool.query(
          `UPDATE recipes SET ${column} = GREATEST(${column} - 1, 0), net_score = net_score + $1 WHERE id = $2`,
          [scoreChange, id]
        );

        return res.json({ success: true, action: 'removed', voteType: null });
      } else {
        // Change vote
        await pool.query(
          'UPDATE recipe_votes SET vote_type = $1 WHERE id = $2',
          [voteType, existing.rows[0].id]
        );

        const upChange = voteType === 'up' ? 1 : -1;
        await pool.query(
          `UPDATE recipes SET upvotes = upvotes + $1, downvotes = downvotes - $1, net_score = net_score + $2 WHERE id = $3`,
          [upChange, upChange * 2, id]
        );

        return res.json({ success: true, action: 'changed', voteType });
      }
    }

    // New vote
    await pool.query(
      'INSERT INTO recipe_votes (recipe_id, voter_id, vote_type) VALUES ($1, $2, $3)',
      [id, recipientId, voteType]
    );

    const column = voteType === 'up' ? 'upvotes' : 'downvotes';
    const scoreChange = voteType === 'up' ? 1 : -1;
    await pool.query(
      `UPDATE recipes SET ${column} = ${column} + 1, net_score = net_score + $1 WHERE id = $2`,
      [scoreChange, id]
    );

    // Auto-hide if net score drops to -3
    await pool.query(
      `UPDATE recipes SET status = 'hidden' WHERE id = $1 AND net_score <= -3 AND status = 'active'`,
      [id]
    );

    res.json({ success: true, action: 'voted', voteType });
  } catch (error) {
    console.error('Error voting on recipe:', error);
    res.status(500).json({ success: false, error: 'Failed to vote on recipe' });
  }
});

/**
 * POST /api/v1/recipes/:id/flag
 * Flag a recipe for moderation
 */
router.post('/:id/flag', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason, flaggerId: rawFlaggerId } = req.body;

    const flaggerId = rawFlaggerId || 'anonymous';

    // Check if already flagged by this user
    const existing = await pool.query(
      'SELECT id FROM recipe_flags WHERE recipe_id = $1 AND flagger_id = $2',
      [id, flaggerId]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, error: 'Already flagged this recipe' });
    }

    await pool.query(
      'INSERT INTO recipe_flags (recipe_id, flagger_id, reason) VALUES ($1, $2, $3)',
      [id, flaggerId, reason || null]
    );

    await pool.query(
      'UPDATE recipes SET flag_count = flag_count + 1 WHERE id = $1',
      [id]
    );

    // Auto-hide after 3 flags
    await pool.query(
      `UPDATE recipes SET status = 'flagged' WHERE id = $1 AND flag_count >= 3 AND status = 'active'`,
      [id]
    );

    res.json({ success: true, message: 'Recipe flagged for review' });
  } catch (error) {
    console.error('Error flagging recipe:', error);
    res.status(500).json({ success: false, error: 'Failed to flag recipe' });
  }
});

/**
 * POST /api/v1/recipes/:id/moderate
 * Admin endpoint: approve or reject a pending recipe
 */
router.post('/:id/moderate', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { action } = req.body;

    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'action must be "approve" or "reject"',
      });
    }

    const newStatus = action === 'approve' ? 'active' : 'rejected';

    await pool.query(
      'UPDATE recipes SET status = $1 WHERE id = $2',
      [newStatus, id]
    );

    res.json({ success: true, message: `Recipe ${action}d successfully`, status: newStatus });
  } catch (error) {
    console.error('Error moderating recipe:', error);
    res.status(500).json({ success: false, error: 'Failed to moderate recipe' });
  }
});

/**
 * Create a GitHub issue for recipe review when a new recipe is submitted
 */
function createRecipeReviewIssue(
  recipeId: string | number,
  title: string,
  category: string,
  wicIngredients: string[],
  nonWicIngredients: string[],
  instructions: string[],
  submittedBy: string
): void {
  if (!GITHUB_REPO || !GITHUB_TOKEN) {
    console.warn('GitHub not configured — skipping recipe review issue creation');
    return;
  }

  const issueTitle = `[Recipe Review] ${title}`;

  let body = `## New Recipe Submission\n\n`;
  body += `**Recipe ID:** ${recipeId}\n`;
  body += `**Title:** ${title}\n`;
  body += `**Category:** ${category}\n`;
  body += `**Submitted By:** ${submittedBy}\n`;
  body += `**Submitted At:** ${new Date().toISOString()}\n\n`;

  body += `### WIC Ingredients\n\n`;
  wicIngredients.forEach((ing, i) => {
    body += `${i + 1}. ${ing}\n`;
  });

  if (nonWicIngredients.length > 0) {
    body += `\n### Other Ingredients\n\n`;
    nonWicIngredients.forEach((ing, i) => {
      body += `${i + 1}. ${ing}\n`;
    });
  }

  body += `\n### Instructions\n\n`;
  instructions.forEach((step, i) => {
    body += `${i + 1}. ${step}\n`;
  });

  body += `\n---\n\n`;
  body += `**Action required:** Review this recipe and moderate via the admin API:\n`;
  body += `- Approve: \`POST /api/v1/recipes/${recipeId}/moderate\` with \`{"action":"approve"}\`\n`;
  body += `- Reject: \`POST /api/v1/recipes/${recipeId}/moderate\` with \`{"action":"reject"}\`\n`;

  const postData = JSON.stringify({ title: issueTitle, body, labels: ['recipe-review'] });

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
        console.log(`Recipe review issue created for recipe #${recipeId}`);
      } else {
        console.error(`Failed to create recipe review issue: ${res.statusCode} ${data}`);
      }
    });
  });

  req.on('error', (err) => {
    console.error('Failed to create recipe review GitHub issue:', err.message);
  });

  req.write(postData);
  req.end();
}

function formatRecipe(row: any) {
  return {
    id: row.id,
    title: row.title,
    titleEs: row.title_es,
    category: row.category,
    prepTime: row.prep_time_minutes,
    servings: row.servings,
    difficulty: row.difficulty,
    wicIngredients: row.wic_ingredients || [],
    nonWicIngredients: row.non_wic_ingredients || [],
    instructions: row.instructions || [],
    submittedBy: row.submitted_by,
    isBundled: row.is_bundled,
    status: row.status,
    upvotes: row.upvotes,
    downvotes: row.downvotes,
    netScore: row.net_score,
    flagCount: row.flag_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export default router;
