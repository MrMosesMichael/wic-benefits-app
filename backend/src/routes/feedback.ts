import express, { Request, Response } from 'express';
import https from 'https';

const router = express.Router();

const GITHUB_REPO = process.env.GITHUB_FEEDBACK_REPO || '';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';

const CATEGORY_LABELS: Record<string, string> = {
  bug: 'bug',
  feature: 'feature-request',
  question: 'question',
};

/**
 * POST /api/v1/feedback
 * Submit feedback — creates a GitHub Issue via the API
 *
 * Body:
 *   - category: 'bug' | 'feature' | 'question' (required)
 *   - description: string (required, max 4000 chars)
 *   - deviceInfo: { platform, osVersion, appVersion } (optional)
 *   - source: 'app' | 'web' (optional, defaults to 'web')
 */
router.post('/', async (req: Request, res: Response) => {
  const { category, description, deviceInfo, source = 'web' } = req.body;

  if (!category || !description) {
    return res.status(400).json({
      success: false,
      error: 'category and description are required',
    });
  }

  if (!['bug', 'feature', 'question'].includes(category)) {
    return res.status(400).json({
      success: false,
      error: 'category must be one of: bug, feature, question',
    });
  }

  if (description.length > 4000) {
    return res.status(400).json({
      success: false,
      error: 'description must be 4000 characters or less',
    });
  }

  if (!GITHUB_REPO || !GITHUB_TOKEN) {
    console.error('GITHUB_FEEDBACK_REPO or GITHUB_TOKEN not configured');
    return res.status(503).json({
      success: false,
      error: 'Feedback system is not configured. Please try again later.',
    });
  }

  // Build issue title
  const titlePrefix = category === 'bug' ? 'Bug' : category === 'feature' ? 'Feature' : 'Question';
  const titleSnippet = description.substring(0, 80).replace(/\n/g, ' ');
  const title = `[${titlePrefix}] ${titleSnippet}${description.length > 80 ? '...' : ''}`;

  // Build issue body
  let body = `## Description\n\n${description}\n\n---\n\n`;
  body += `**Source:** ${source === 'app' ? 'In-App' : 'Web Form'}\n`;
  body += `**Submitted:** ${new Date().toISOString()}\n`;

  if (deviceInfo) {
    body += `\n### Device Info\n`;
    if (deviceInfo.platform) body += `- **Platform:** ${deviceInfo.platform}\n`;
    if (deviceInfo.osVersion) body += `- **OS Version:** ${deviceInfo.osVersion}\n`;
    if (deviceInfo.appVersion) body += `- **App Version:** ${deviceInfo.appVersion}\n`;
  }

  const label = CATEGORY_LABELS[category] || 'question';

  try {
    const issueUrl = await createGitHubIssue(title, body, [label]);

    res.json({
      success: true,
      message: 'Thank you for your feedback!',
      issueUrl,
    });
  } catch (error: any) {
    console.error('Failed to create GitHub issue:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to submit feedback. Please try again later.',
    });
  }
});

/**
 * Create a GitHub Issue using the REST API (native https, no extra deps)
 */
function createGitHubIssue(
  title: string,
  body: string,
  labels: string[]
): Promise<string> {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ title, body, labels });

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
          const issue = JSON.parse(data);
          resolve(issue.html_url);
        } else {
          reject(new Error(`GitHub API returned ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

export default router;
