/**
 * Automated Recipe Review Script (Rule-Based)
 *
 * Reviews pending community-submitted recipes using content rules:
 *  - Spam/gibberish detection (word counts, character patterns)
 *  - Profanity/inappropriate content blocklist
 *  - WIC ingredient validation against known categories
 *  - Sanity checks (prep time, servings, non-empty fields)
 *
 * Recipes that pass all checks → auto-approved.
 * Recipes that fail → stay pending with GitHub comment explaining why.
 *
 * Usage:
 *   npm run review-recipes              # Review and act on pending recipes
 *   npm run review-recipes -- --dry-run # Preview decisions without changes
 *
 * Requires:
 *   GITHUB_TOKEN         — GitHub personal access token (for comments)
 *   GITHUB_FEEDBACK_REPO — e.g. "MrMosesMichael/wic-benefits-feedback"
 *   DATABASE_URL         — PostgreSQL connection string
 */

import https from 'https';
import pool from '../config/database';

const GITHUB_REPO = process.env.GITHUB_FEEDBACK_REPO || '';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';

interface ReviewDecision {
  decision: 'approve' | 'reject' | 'flag';
  reason: string;
  failures: string[];
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

// ─── Content Rules ──────────────────────────────────────────────

/**
 * Profanity / inappropriate content blocklist.
 * Kept intentionally short — catches obvious abuse, not edge cases.
 */
const BLOCKLIST = [
  'fuck', 'shit', 'bitch', 'asshole', 'damn', 'crap', 'dick', 'pussy',
  'nigger', 'faggot', 'retard', 'whore', 'slut',
  'kill yourself', 'kys',
  'viagra', 'cialis', 'casino', 'poker', 'cryptocurrency', 'bitcoin',
  'click here', 'buy now', 'free money', 'act now', 'limited time',
  'http://', 'https://', 'www.', '.com/', '.net/',
];

/**
 * Known WIC-eligible food categories.
 * We check that at least one WIC ingredient loosely matches these.
 */
const WIC_FOOD_KEYWORDS = [
  // Dairy
  'milk', 'cheese', 'yogurt', 'leche', 'queso',
  // Protein
  'egg', 'eggs', 'huevo', 'bean', 'beans', 'frijol', 'peanut butter',
  'crema de mani', 'tofu', 'tuna', 'salmon', 'sardine', 'atun',
  // Grains
  'bread', 'pan', 'cereal', 'oat', 'oats', 'avena', 'rice', 'arroz',
  'tortilla', 'pasta', 'whole grain', 'whole wheat', 'integral',
  // Fruits & vegetables
  'fruit', 'fruta', 'vegetable', 'verdura', 'banana', 'apple', 'manzana',
  'carrot', 'zanahoria', 'spinach', 'espinaca', 'tomato', 'tomate',
  'orange', 'naranja', 'grape', 'berr', 'lettuce', 'lechuga',
  'pepper', 'pimiento', 'corn', 'maiz', 'potato', 'papa', 'broccoli',
  'pea', 'squash', 'sweet potato', 'camote', 'onion', 'cebolla',
  'cucumber', 'pepino', 'peach', 'durazno', 'pear', 'pera',
  'melon', 'watermelon', 'sandia', 'mango', 'plum', 'ciruela',
  'avocado', 'aguacate', 'cabbage', 'col', 'celery', 'apio',
  // Juice
  'juice', 'jugo',
  // Baby food / formula
  'formula', 'baby food', 'comida para bebe', 'infant',
  // CVB (cash value benefit — covers fruits & veggies)
  'cvb', 'fresh',
];

const VALID_CATEGORIES = ['breakfast', 'lunch', 'dinner', 'snacks', 'baby_food'];
const VALID_DIFFICULTIES = ['easy', 'medium', 'hard'];

// ─── Review Checks ──────────────────────────────────────────────

function reviewRecipe(recipe: PendingRecipe): ReviewDecision {
  const failures: string[] = [];

  // 1. Title checks
  if (!recipe.title || recipe.title.trim().length < 3) {
    failures.push('Title is too short (min 3 characters)');
  }
  if (recipe.title && recipe.title.length > 200) {
    failures.push('Title is too long (max 200 characters)');
  }

  // 2. Category & difficulty validation
  if (!VALID_CATEGORIES.includes(recipe.category)) {
    failures.push(`Invalid category "${recipe.category}"`);
  }
  if (!VALID_DIFFICULTIES.includes(recipe.difficulty)) {
    failures.push(`Invalid difficulty "${recipe.difficulty}"`);
  }

  // 3. Prep time sanity (1 min to 8 hours)
  if (!recipe.prep_time_minutes || recipe.prep_time_minutes < 1 || recipe.prep_time_minutes > 480) {
    failures.push(`Prep time ${recipe.prep_time_minutes} min is out of range (1-480)`);
  }

  // 4. Servings sanity (1 to 50)
  if (!recipe.servings || recipe.servings < 1 || recipe.servings > 50) {
    failures.push(`Servings ${recipe.servings} is out of range (1-50)`);
  }

  // 5. Must have at least one WIC ingredient
  const wicIngredients = recipe.wic_ingredients || [];
  if (wicIngredients.length === 0) {
    failures.push('No WIC ingredients listed');
  }

  // 6. WIC ingredients should contain at least one recognized WIC food
  if (wicIngredients.length > 0) {
    const allIngredientsText = wicIngredients.join(' ').toLowerCase();
    const hasWicFood = WIC_FOOD_KEYWORDS.some(kw => allIngredientsText.includes(kw));
    if (!hasWicFood) {
      failures.push('No recognized WIC-eligible food in WIC ingredients list');
    }
  }

  // 7. Must have at least one instruction step with meaningful content
  const instructions = (recipe.instructions || []).filter(s => s.trim().length > 0);
  if (instructions.length === 0) {
    failures.push('No instructions provided');
  } else {
    // Each step should have at least 5 characters
    const tooShort = instructions.filter(s => s.trim().length < 5);
    if (tooShort.length === instructions.length) {
      failures.push('All instruction steps are too short (min 5 chars each)');
    }
  }

  // 8. Total instruction content should have some substance
  const totalInstructionWords = instructions.join(' ').split(/\s+/).filter(w => w.length > 0).length;
  if (totalInstructionWords < 5) {
    failures.push(`Instructions too brief (${totalInstructionWords} words, min 5)`);
  }

  // 9. Gibberish detection — check for repeated character patterns
  const allText = [
    recipe.title,
    ...wicIngredients,
    ...(recipe.non_wic_ingredients || []),
    ...instructions,
  ].join(' ');

  // Check for excessive repeated characters (e.g., "aaaaaaa", "hahahahaha")
  if (/(.)\1{6,}/.test(allText)) {
    failures.push('Contains excessive repeated characters (possible gibberish)');
  }

  // Check for very low unique character ratio (gibberish like "asdfasdfasdf")
  const chars = allText.toLowerCase().replace(/\s/g, '');
  if (chars.length > 20) {
    const uniqueChars = new Set(chars).size;
    const ratio = uniqueChars / chars.length;
    if (ratio < 0.08) {
      failures.push('Very low character variety (possible gibberish)');
    }
  }

  // 10. Profanity / spam / URL check
  const allTextLower = allText.toLowerCase();
  for (const term of BLOCKLIST) {
    if (allTextLower.includes(term)) {
      failures.push(`Contains blocked content: "${term}"`);
      break; // One is enough to flag
    }
  }

  // 11. Ingredient count sanity — shouldn't have 50 ingredients
  if (wicIngredients.length > 25) {
    failures.push(`Too many WIC ingredients (${wicIngredients.length}, max 25)`);
  }
  if ((recipe.non_wic_ingredients || []).length > 25) {
    failures.push(`Too many non-WIC ingredients (${recipe.non_wic_ingredients.length}, max 25)`);
  }

  // 12. Instruction count sanity
  if (instructions.length > 30) {
    failures.push(`Too many instruction steps (${instructions.length}, max 30)`);
  }

  // ─── Decision logic ───

  if (failures.length === 0) {
    return {
      decision: 'approve',
      reason: 'Passed all content checks — legitimate recipe with valid WIC ingredients',
      failures: [],
    };
  }

  // Hard reject: blocked content (profanity, spam, URLs)
  const hasBlockedContent = failures.some(f => f.startsWith('Contains blocked content'));
  if (hasBlockedContent) {
    return {
      decision: 'reject',
      reason: failures.join('; '),
      failures,
    };
  }

  // Hard reject: total gibberish (no real ingredients + no real instructions)
  const noIngredients = failures.some(f => f.includes('No WIC ingredients'));
  const noInstructions = failures.some(f => f.includes('No instructions'));
  if (noIngredients && noInstructions) {
    return {
      decision: 'reject',
      reason: 'Missing both ingredients and instructions — not a valid recipe',
      failures,
    };
  }

  // Everything else: flag for human review
  return {
    decision: 'flag',
    reason: failures.join('; '),
    failures,
  };
}

// ─── Database & GitHub ──────────────────────────────────────────

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

async function applyDecision(recipeId: number, decision: ReviewDecision): Promise<void> {
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

    const searchQuery = encodeURIComponent(
      `repo:${GITHUB_REPO} is:issue "[Recipe Review] ${recipeTitle}" in:title`
    );
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
      decision.decision === 'approve' ? 'AUTO-APPROVED' :
      decision.decision === 'reject' ? 'REJECTED' : 'FLAGGED FOR HUMAN REVIEW';

    let body = `## ${emoji} Automated Recipe Review\n\n`;
    body += `**Recipe:** #${recipeId} — ${recipeTitle}\n`;
    body += `**Decision:** ${statusLabel}\n`;
    body += `**Reason:** ${decision.reason}\n`;

    if (decision.failures.length > 0) {
      body += `\n**Checks failed:**\n`;
      for (const f of decision.failures) {
        body += `- ${f}\n`;
      }
    }

    body += `\n---\n`;
    body += `*Reviewed automatically by rule-based content moderation*`;

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

// ─── Main ───────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('=== WIC Recipe Review Script (Rule-Based) ===');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  if (DRY_RUN) {
    console.log('MODE: DRY RUN (no changes will be made)');
  }
  console.log('');

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

  for (const recipe of pendingRecipes) {
    console.log(`--- Reviewing Recipe #${recipe.id}: ${recipe.title} ---`);

    const decision = reviewRecipe(recipe);

    const tag = decision.decision.toUpperCase();
    console.log(`[${tag}] Recipe #${recipe.id}: ${recipe.title}`);
    console.log(`  Reason: ${decision.reason}`);

    switch (decision.decision) {
      case 'approve': approved++; break;
      case 'reject': rejected++; break;
      case 'flag': flagged++; break;
    }

    if (!DRY_RUN) {
      await applyDecision(recipe.id, decision);
      await commentOnGitHubIssue(recipe.id, recipe.title, decision);
    }

    console.log('');
  }

  console.log('=== Review Summary ===');
  console.log(`Total reviewed: ${pendingRecipes.length}`);
  console.log(`Approved: ${approved}`);
  console.log(`Rejected: ${rejected}`);
  console.log(`Flagged for human review: ${flagged}`);
  if (DRY_RUN) {
    console.log('(Dry run — no changes were made)');
  }

  await pool.end();
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

export { main, reviewRecipe, fetchPendingRecipes };
