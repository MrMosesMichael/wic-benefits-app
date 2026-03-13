/**
 * Automated Recipe Review Script
 *
 * Uses Claude API to review pending community-submitted recipes.
 * For each pending recipe, Claude evaluates whether it's a legitimate,
 * safe, WIC-appropriate recipe and returns approve/reject/flag.
 *
 * Usage:
 *   npm run review-recipes              # Review and act on pending recipes
 *   npm run review-recipes -- --dry-run # Preview decisions without changes
 *
 * Requires:
 *   ANTHROPIC_API_KEY  — Claude API key
 *   GITHUB_TOKEN       — GitHub personal access token
 *   GITHUB_FEEDBACK_REPO — e.g. "MrMosesMichael/wic-benefits-feedback"
 *   DATABASE_URL       — PostgreSQL connection string
 */

import Anthropic from '@anthropic-ai/sdk';
import https from 'https';
import pool from '../config/database';

const GITHUB_REPO = process.env.GITHUB_FEEDBACK_REPO || '';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';

interface ReviewDecision {
  decision: 'approve' | 'reject' | 'flag';
  reason: string;
}

interface PendingRecipe {
  id: number;
  title: string;
  title_es: string | null;
  category: string;
  prep_time_minutes: number;
  servings: number;
  difficulty: string;
  wic_ingredients: string[];
  non_wic_ingredients: string[];
  instructions: string[];
  submitted_by: string;
  created_at: string;
}

const DRY_RUN = process.argv.includes('--dry-run');

/**
 * Fetch all pending recipes from the database
 */
async function fetchPendingRecipes(): Promise<PendingRecipe[]> {
  const result = await pool.query(
    `SELECT id, title, title_es, category, prep_time_minutes, servings,
            difficulty, wic_ingredients, non_wic_ingredients, instructions,
            submitted_by, created_at
     FROM recipes
     WHERE status = 'pending'
     ORDER BY created_at ASC`
  );
  return result.rows;
}

/**
 * Ask Claude to review a single recipe
 */
async function reviewRecipe(
  client: Anthropic,
  recipe: PendingRecipe
): Promise<ReviewDecision> {
  const prompt = `You are a content moderator for a WIC (Women, Infants, and Children) benefits app.
Your job is to review community-submitted recipes to ensure they are safe, appropriate, and legitimate.

Review the following recipe and evaluate it against these criteria:

1. **Real food check:** Is this a real, edible recipe with reasonable ingredients and instructions? Not gibberish, jokes, or impossible food.
2. **WIC ingredient validity:** Are the listed WIC ingredients actually items typically covered by WIC benefits? (Common WIC items: milk, eggs, cheese, whole grains, cereals, bread, fruits, vegetables, beans, peanut butter, juice, yogurt, tofu, canned fish, infant formula, baby food.)
3. **Content appropriateness:** Is the content free of harmful, offensive, racist, sexual, or otherwise inappropriate material?
4. **Safety:** Are the cooking instructions safe and followable? No dangerous techniques for a home cook, no raw meat recommendations for vulnerable populations, etc.
5. **Spam/ad check:** Is this a genuine recipe submission, not spam, an advertisement, SEO content, or gibberish?

Recipe to review:
- Title: ${recipe.title}${recipe.title_es ? `\n- Title (Spanish): ${recipe.title_es}` : ''}
- Category: ${recipe.category}
- Prep Time: ${recipe.prep_time_minutes} minutes
- Servings: ${recipe.servings}
- Difficulty: ${recipe.difficulty}
- WIC Ingredients: ${JSON.stringify(recipe.wic_ingredients)}
- Other Ingredients: ${JSON.stringify(recipe.non_wic_ingredients)}
- Instructions: ${JSON.stringify(recipe.instructions)}
- Submitted By: ${recipe.submitted_by}

Respond with ONLY a JSON object (no markdown, no code fences):
{"decision": "approve" | "reject" | "flag", "reason": "Brief explanation of your decision"}

Decision guide:
- "approve": Legitimate recipe, safe, appropriate, WIC ingredients are valid
- "reject": Clearly spam, gibberish, offensive, dangerous, or entirely non-food content
- "flag": Borderline — might be okay but needs human review (e.g., unusual ingredients, unclear instructions, minor concerns)`;

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    messages: [{ role: 'user', content: prompt }],
  });

  // Extract text from the response
  const textBlock = message.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude');
  }

  const responseText = textBlock.text.trim();

  // Parse JSON — strip markdown fences if present
  const jsonStr = responseText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  let parsed: any;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new Error(`Failed to parse Claude response as JSON: ${responseText}`);
  }

  // Validate the decision
  if (!['approve', 'reject', 'flag'].includes(parsed.decision)) {
    throw new Error(`Invalid decision "${parsed.decision}" from Claude`);
  }

  return {
    decision: parsed.decision,
    reason: parsed.reason || 'No reason provided',
  };
}

/**
 * Update the recipe status in the database
 */
async function applyDecision(
  recipeId: number,
  decision: ReviewDecision
): Promise<void> {
  let newStatus: string;
  switch (decision.decision) {
    case 'approve':
      newStatus = 'active';
      break;
    case 'reject':
      newStatus = 'rejected';
      break;
    case 'flag':
      // Leave as pending for human review
      return;
    default:
      return;
  }

  await pool.query('UPDATE recipes SET status = $1, updated_at = NOW() WHERE id = $2', [
    newStatus,
    recipeId,
  ]);
}

/**
 * Search for the GitHub issue matching a recipe and post a comment
 */
function commentOnGitHubIssue(
  recipeId: number,
  recipeTitle: string,
  decision: ReviewDecision
): Promise<void> {
  return new Promise((resolve) => {
    if (!GITHUB_REPO || !GITHUB_TOKEN) {
      console.log('  GitHub not configured — skipping issue comment');
      resolve();
      return;
    }

    // Search for the issue by title
    const searchQuery = encodeURIComponent(`repo:${GITHUB_REPO} is:issue "[Recipe Review] ${recipeTitle}" in:title`);
    const searchOptions = {
      hostname: 'api.github.com',
      path: `/search/issues?q=${searchQuery}&per_page=1`,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'WIC-Benefits-App',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    };

    const searchReq = https.request(searchOptions, (searchRes) => {
      let data = '';
      searchRes.on('data', (chunk) => (data += chunk));
      searchRes.on('end', () => {
        try {
          const searchResult = JSON.parse(data);
          if (!searchResult.items || searchResult.items.length === 0) {
            console.log(`  No GitHub issue found for recipe #${recipeId}`);
            resolve();
            return;
          }

          const issueNumber = searchResult.items[0].number;
          postComment(issueNumber, recipeId, recipeTitle, decision).then(resolve);
        } catch (err) {
          console.error(`  Failed to search GitHub issues: ${err}`);
          resolve();
        }
      });
    });

    searchReq.on('error', (err) => {
      console.error(`  GitHub search request failed: ${err.message}`);
      resolve();
    });

    searchReq.end();
  });
}

/**
 * Post a comment on a specific GitHub issue
 */
function postComment(
  issueNumber: number,
  recipeId: number,
  recipeTitle: string,
  decision: ReviewDecision
): Promise<void> {
  return new Promise((resolve) => {
    const emoji =
      decision.decision === 'approve' ? '✅' :
      decision.decision === 'reject' ? '❌' : '⚠️';

    const statusLabel =
      decision.decision === 'approve' ? 'APPROVED' :
      decision.decision === 'reject' ? 'REJECTED' : 'FLAGGED FOR HUMAN REVIEW';

    let body = `## ${emoji} Automated Recipe Review\n\n`;
    body += `**Recipe:** #${recipeId} — ${recipeTitle}\n`;
    body += `**Decision:** ${statusLabel}\n`;
    body += `**Reason:** ${decision.reason}\n\n`;
    body += `---\n`;
    body += `*Reviewed automatically by Claude (claude-haiku-4-5-20251001)*`;

    const postData = JSON.stringify({ body });

    const options = {
      hostname: 'api.github.com',
      path: `/repos/${GITHUB_REPO}/issues/${issueNumber}/comments`,
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
          console.log(`  Commented on GitHub issue #${issueNumber}`);
        } else {
          console.error(`  Failed to comment on issue #${issueNumber}: ${res.statusCode}`);
        }
        resolve();
      });
    });

    req.on('error', (err) => {
      console.error(`  GitHub comment request failed: ${err.message}`);
      resolve();
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  console.log('=== WIC Recipe Review Script ===');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  if (DRY_RUN) {
    console.log('MODE: DRY RUN (no changes will be made)');
  }
  console.log('');

  // Validate API key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ERROR: ANTHROPIC_API_KEY environment variable is required');
    process.exit(1);
  }

  const client = new Anthropic({ apiKey });

  // Fetch pending recipes
  const pendingRecipes = await fetchPendingRecipes();
  console.log(`Found ${pendingRecipes.length} pending recipe(s) to review.`);
  console.log('');

  if (pendingRecipes.length === 0) {
    console.log('Nothing to review. Exiting.');
    await pool.end();
    return;
  }

  let approved = 0;
  let rejected = 0;
  let flagged = 0;
  let errors = 0;

  for (const recipe of pendingRecipes) {
    console.log(`--- Reviewing Recipe #${recipe.id}: ${recipe.title} ---`);

    try {
      const decision = await reviewRecipe(client, recipe);

      // Log the decision
      const tag = decision.decision.toUpperCase();
      console.log(`[${tag}] Recipe #${recipe.id}: ${recipe.title} -- ${decision.reason}`);

      // Track counts
      switch (decision.decision) {
        case 'approve':
          approved++;
          break;
        case 'reject':
          rejected++;
          break;
        case 'flag':
          flagged++;
          break;
      }

      if (!DRY_RUN) {
        // Apply the decision to the database
        await applyDecision(recipe.id, decision);

        // Comment on the GitHub issue
        await commentOnGitHubIssue(recipe.id, recipe.title, decision);
      }

      console.log('');
    } catch (err: any) {
      errors++;
      console.error(`[ERROR] Recipe #${recipe.id}: ${recipe.title} -- ${err.message}`);
      console.log('  Skipping this recipe and continuing...');
      console.log('');
    }
  }

  // Summary
  console.log('=== Review Summary ===');
  console.log(`Total reviewed: ${pendingRecipes.length}`);
  console.log(`Approved: ${approved}`);
  console.log(`Rejected: ${rejected}`);
  console.log(`Flagged for human review: ${flagged}`);
  console.log(`Errors: ${errors}`);
  if (DRY_RUN) {
    console.log('(Dry run — no changes were made)');
  }

  await pool.end();
}

// Run if called directly
if (require.main === module) {
  main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

export { main, reviewRecipe, fetchPendingRecipes };
