/**
 * Automated Content Review Script (Rule-Based)
 *
 * Reviews pending community-submitted recipes AND tips using content rules:
 *  - Spam/gibberish detection (word counts, character patterns)
 *  - Profanity/inappropriate content blocklist
 *  - WIC ingredient validation (recipes only)
 *  - Sanity checks (lengths, field counts)
 *
 * Clean content → auto-approved. Blocked content → rejected.
 * Borderline → stays pending for human review + GitHub comment.
 *
 * Usage:
 *   npm run review-content              # Review all pending content
 *   npm run review-content -- --dry-run # Preview without changes
 *   npm run review-content -- --tips    # Tips only
 *   npm run review-content -- --recipes # Recipes only
 *
 * Requires:
 *   GITHUB_TOKEN         — GitHub personal access token
 *   GITHUB_FEEDBACK_REPO — e.g. "MrMosesMichael/wic-benefits-feedback"
 *   DATABASE_URL         — PostgreSQL connection string
 */

import https from 'https';
import pool from '../config/database';

const GITHUB_REPO = process.env.GITHUB_FEEDBACK_REPO || '';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';

const DRY_RUN = process.argv.includes('--dry-run');
const TIPS_ONLY = process.argv.includes('--tips');
const RECIPES_ONLY = process.argv.includes('--recipes');

interface ReviewDecision {
  decision: 'approve' | 'reject' | 'flag';
  reason: string;
  failures: string[];
}

// ─── Shared Content Rules ───────────────────────────────────────

const BLOCKLIST = [
  'fuck', 'shit', 'bitch', 'asshole', 'damn', 'crap', 'dick', 'pussy',
  'nigger', 'faggot', 'retard', 'whore', 'slut',
  'kill yourself', 'kys',
  'viagra', 'cialis', 'casino', 'poker', 'cryptocurrency', 'bitcoin',
  'click here', 'buy now', 'free money', 'act now', 'limited time',
  'http://', 'https://', 'www.', '.com/', '.net/',
];

// Terms that need word-boundary matching to avoid false positives (e.g. "dick" in "diced")
const WORD_BOUNDARY_TERMS = new Set(['dick', 'damn', 'crap', 'kys']);

function checkBlocklist(text: string): string | null {
  const lower = text.toLowerCase();
  for (const term of BLOCKLIST) {
    if (WORD_BOUNDARY_TERMS.has(term)) {
      const regex = new RegExp(`\\b${term}\\b`);
      if (regex.test(lower)) return term;
    } else {
      if (lower.includes(term)) return term;
    }
  }
  return null;
}

function checkGibberish(text: string): string[] {
  const failures: string[] = [];
  // Excessive repeated characters
  if (/(.)\1{6,}/.test(text)) {
    failures.push('Contains excessive repeated characters (possible gibberish)');
  }
  // Low character variety
  const chars = text.toLowerCase().replace(/\s/g, '');
  if (chars.length > 20) {
    const uniqueChars = new Set(chars).size;
    if (uniqueChars / chars.length < 0.08) {
      failures.push('Very low character variety (possible gibberish)');
    }
  }
  return failures;
}

// ─── Tip Review ─────────────────────────────────────────────────

interface PendingTip {
  id: number;
  title: string;
  content: string;
  category: string;
  tags: string[];
  submitted_by: string;
  created_at: string;
}

const VALID_TIP_CATEGORIES = ['shopping', 'savings', 'seasonal', 'checkout', 'rights', 'guidelines'];

function reviewTip(tip: PendingTip): ReviewDecision {
  const failures: string[] = [];

  // Title: 3-100 chars
  if (!tip.title || tip.title.trim().length < 3) {
    failures.push('Title is too short (min 3 characters)');
  }
  if (tip.title && tip.title.length > 100) {
    failures.push('Title is too long (max 100 characters)');
  }

  // Content: 10-500 chars, at least 3 words
  if (!tip.content || tip.content.trim().length < 10) {
    failures.push('Content is too short (min 10 characters)');
  }
  if (tip.content && tip.content.length > 500) {
    failures.push('Content is too long (max 500 characters)');
  }
  const wordCount = (tip.content || '').split(/\s+/).filter(w => w.length > 0).length;
  if (wordCount < 3) {
    failures.push(`Content too brief (${wordCount} words, min 3)`);
  }

  // Valid category
  if (!VALID_TIP_CATEGORIES.includes(tip.category)) {
    failures.push(`Invalid category "${tip.category}"`);
  }

  // Blocklist
  const allText = [tip.title, tip.content].join(' ');
  const blocked = checkBlocklist(allText);
  if (blocked) {
    failures.push(`Contains blocked content: "${blocked}"`);
  }

  // Gibberish
  failures.push(...checkGibberish(allText));

  // Decision
  if (failures.length === 0) {
    return {
      decision: 'approve',
      reason: 'Passed all content checks — legitimate shopping tip',
      failures: [],
    };
  }

  if (failures.some(f => f.startsWith('Contains blocked content'))) {
    return { decision: 'reject', reason: failures.join('; '), failures };
  }

  return { decision: 'flag', reason: failures.join('; '), failures };
}

// ─── Recipe Review ──────────────────────────────────────────────

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

const WIC_FOOD_KEYWORDS = [
  'milk', 'cheese', 'yogurt', 'leche', 'queso',
  'egg', 'eggs', 'huevo', 'bean', 'beans', 'frijol', 'peanut butter',
  'crema de mani', 'tofu', 'tuna', 'salmon', 'sardine', 'atun',
  'bread', 'pan', 'cereal', 'oat', 'oats', 'avena', 'rice', 'arroz',
  'tortilla', 'pasta', 'whole grain', 'whole wheat', 'integral',
  'fruit', 'fruta', 'vegetable', 'verdura', 'banana', 'apple', 'manzana',
  'carrot', 'zanahoria', 'spinach', 'espinaca', 'tomato', 'tomate',
  'orange', 'naranja', 'grape', 'berr', 'lettuce', 'lechuga',
  'pepper', 'pimiento', 'corn', 'maiz', 'potato', 'papa', 'broccoli',
  'pea', 'squash', 'sweet potato', 'camote', 'onion', 'cebolla',
  'cucumber', 'pepino', 'peach', 'durazno', 'pear', 'pera',
  'melon', 'watermelon', 'sandia', 'mango', 'plum', 'ciruela',
  'avocado', 'aguacate', 'cabbage', 'col', 'celery', 'apio',
  'juice', 'jugo', 'formula', 'baby food', 'comida para bebe', 'infant',
  'cvb', 'fresh',
];

const VALID_RECIPE_CATEGORIES = ['breakfast', 'lunch', 'dinner', 'snacks', 'baby_food'];
const VALID_DIFFICULTIES = ['easy', 'medium', 'hard'];

function reviewRecipe(recipe: PendingRecipe): ReviewDecision {
  const failures: string[] = [];

  // Title
  if (!recipe.title || recipe.title.trim().length < 3) {
    failures.push('Title is too short (min 3 characters)');
  }
  if (recipe.title && recipe.title.length > 200) {
    failures.push('Title is too long (max 200 characters)');
  }

  // Category & difficulty
  if (!VALID_RECIPE_CATEGORIES.includes(recipe.category)) {
    failures.push(`Invalid category "${recipe.category}"`);
  }
  if (!VALID_DIFFICULTIES.includes(recipe.difficulty)) {
    failures.push(`Invalid difficulty "${recipe.difficulty}"`);
  }

  // Prep time & servings
  if (!recipe.prep_time_minutes || recipe.prep_time_minutes < 1 || recipe.prep_time_minutes > 480) {
    failures.push(`Prep time ${recipe.prep_time_minutes} min is out of range (1-480)`);
  }
  if (!recipe.servings || recipe.servings < 1 || recipe.servings > 50) {
    failures.push(`Servings ${recipe.servings} is out of range (1-50)`);
  }

  // WIC ingredients
  const wicIngredients = recipe.wic_ingredients || [];
  if (wicIngredients.length === 0) {
    failures.push('No WIC ingredients listed');
  } else if (wicIngredients.length > 25) {
    failures.push(`Too many WIC ingredients (${wicIngredients.length}, max 25)`);
  } else {
    const allIngredientsText = wicIngredients.join(' ').toLowerCase();
    if (!WIC_FOOD_KEYWORDS.some(kw => allIngredientsText.includes(kw))) {
      failures.push('No recognized WIC-eligible food in WIC ingredients list');
    }
  }

  // Instructions
  const instructions = (recipe.instructions || []).filter(s => s.trim().length > 0);
  if (instructions.length === 0) {
    failures.push('No instructions provided');
  } else if (instructions.length > 30) {
    failures.push(`Too many instruction steps (${instructions.length}, max 30)`);
  } else {
    const totalWords = instructions.join(' ').split(/\s+/).filter(w => w.length > 0).length;
    if (totalWords < 5) {
      failures.push(`Instructions too brief (${totalWords} words, min 5)`);
    }
  }

  // Non-WIC ingredient count
  if ((recipe.non_wic_ingredients || []).length > 25) {
    failures.push(`Too many non-WIC ingredients (${recipe.non_wic_ingredients.length}, max 25)`);
  }

  // Blocklist
  const allText = [
    recipe.title,
    ...wicIngredients,
    ...(recipe.non_wic_ingredients || []),
    ...instructions,
  ].join(' ');
  const blocked = checkBlocklist(allText);
  if (blocked) {
    failures.push(`Contains blocked content: "${blocked}"`);
  }

  // Gibberish
  failures.push(...checkGibberish(allText));

  // Decision
  if (failures.length === 0) {
    return {
      decision: 'approve',
      reason: 'Passed all content checks — legitimate recipe with valid WIC ingredients',
      failures: [],
    };
  }

  if (failures.some(f => f.startsWith('Contains blocked content'))) {
    return { decision: 'reject', reason: failures.join('; '), failures };
  }

  const noIngredients = failures.some(f => f.includes('No WIC ingredients'));
  const noInstructions = failures.some(f => f.includes('No instructions'));
  if (noIngredients && noInstructions) {
    return { decision: 'reject', reason: 'Missing both ingredients and instructions', failures };
  }

  return { decision: 'flag', reason: failures.join('; '), failures };
}

// ─── Database Operations ────────────────────────────────────────

async function fetchPendingTips(): Promise<PendingTip[]> {
  const result = await pool.query(
    `SELECT id, title, content, category, tags, submitted_by, created_at
     FROM community_tips WHERE status = 'pending' ORDER BY created_at ASC`
  );
  return result.rows;
}

async function fetchPendingRecipes(): Promise<PendingRecipe[]> {
  const result = await pool.query(
    `SELECT id, title, title_es, category, prep_time_minutes, servings,
            difficulty, wic_ingredients, non_wic_ingredients, instructions,
            submitted_by, created_at
     FROM recipes WHERE status = 'pending' ORDER BY created_at ASC`
  );
  return result.rows;
}

async function applyDecision(table: string, id: number, decision: ReviewDecision): Promise<void> {
  let newStatus: string;
  switch (decision.decision) {
    case 'approve': newStatus = 'active'; break;
    case 'reject': newStatus = 'rejected'; break;
    case 'flag': return; // leave as pending
    default: return;
  }
  await pool.query(`UPDATE ${table} SET status = $1, updated_at = NOW() WHERE id = $2`, [newStatus, id]);
}

// ─── GitHub Comments ────────────────────────────────────────────

function commentOnGitHubIssue(
  searchTitle: string,
  itemId: number,
  itemTitle: string,
  decision: ReviewDecision
): Promise<void> {
  return new Promise((resolve) => {
    if (!GITHUB_REPO || !GITHUB_TOKEN) {
      console.log('  GitHub not configured — skipping comment');
      resolve();
      return;
    }

    const searchQuery = encodeURIComponent(
      `repo:${GITHUB_REPO} is:issue "${searchTitle}" in:title`
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
          const result = JSON.parse(data);
          if (!result.items || result.items.length === 0) {
            console.log(`  No GitHub issue found for "${searchTitle}"`);
            resolve();
            return;
          }
          postComment(result.items[0].number, itemId, itemTitle, decision).then(resolve);
        } catch (err) {
          console.error(`  GitHub search error: ${err}`);
          resolve();
        }
      });
    });

    searchReq.on('error', (err) => {
      console.error(`  GitHub search failed: ${err.message}`);
      resolve();
    });
    searchReq.end();
  });
}

function postComment(
  issueNumber: number,
  itemId: number,
  itemTitle: string,
  decision: ReviewDecision
): Promise<void> {
  return new Promise((resolve) => {
    const emoji = decision.decision === 'approve' ? '✅' :
                  decision.decision === 'reject' ? '❌' : '⚠️';
    const statusLabel = decision.decision === 'approve' ? 'AUTO-APPROVED' :
                        decision.decision === 'reject' ? 'REJECTED' : 'FLAGGED FOR HUMAN REVIEW';

    let body = `## ${emoji} Automated Content Review\n\n`;
    body += `**Item:** #${itemId} — ${itemTitle}\n`;
    body += `**Decision:** ${statusLabel}\n`;
    body += `**Reason:** ${decision.reason}\n`;
    if (decision.failures.length > 0) {
      body += `\n**Checks failed:**\n`;
      for (const f of decision.failures) body += `- ${f}\n`;
    }
    body += `\n---\n*Reviewed by rule-based content moderation*`;

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
        if (res.statusCode === 201) console.log(`  Commented on issue #${issueNumber}`);
        else console.error(`  Failed to comment on #${issueNumber}: ${res.statusCode}`);
        resolve();
      });
    });
    req.on('error', (err) => {
      console.error(`  Comment failed: ${err.message}`);
      resolve();
    });
    req.write(postData);
    req.end();
  });
}

// ─── Main ───────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('=== WIC Content Review (Rule-Based) ===');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  if (DRY_RUN) console.log('MODE: DRY RUN');
  console.log('');

  let totalApproved = 0, totalRejected = 0, totalFlagged = 0;

  // ── Review Tips ──
  if (!RECIPES_ONLY) {
    const tips = await fetchPendingTips();
    console.log(`[Tips] ${tips.length} pending`);

    for (const tip of tips) {
      const decision = reviewTip(tip);
      const tag = decision.decision.toUpperCase();
      console.log(`  [${tag}] Tip #${tip.id}: ${tip.title} — ${decision.reason}`);

      switch (decision.decision) {
        case 'approve': totalApproved++; break;
        case 'reject': totalRejected++; break;
        case 'flag': totalFlagged++; break;
      }

      if (!DRY_RUN) {
        await applyDecision('community_tips', tip.id, decision);
        await commentOnGitHubIssue(`[Tip Review] ${tip.title}`, tip.id, tip.title, decision);
      }
    }
    console.log('');
  }

  // ── Review Recipes ──
  if (!TIPS_ONLY) {
    const recipes = await fetchPendingRecipes();
    console.log(`[Recipes] ${recipes.length} pending`);

    for (const recipe of recipes) {
      const decision = reviewRecipe(recipe);
      const tag = decision.decision.toUpperCase();
      console.log(`  [${tag}] Recipe #${recipe.id}: ${recipe.title} — ${decision.reason}`);

      switch (decision.decision) {
        case 'approve': totalApproved++; break;
        case 'reject': totalRejected++; break;
        case 'flag': totalFlagged++; break;
      }

      if (!DRY_RUN) {
        await applyDecision('recipes', recipe.id, decision);
        await commentOnGitHubIssue(`[Recipe Review] ${recipe.title}`, recipe.id, recipe.title, decision);
      }
    }
    console.log('');
  }

  console.log('=== Summary ===');
  console.log(`Approved: ${totalApproved} | Rejected: ${totalRejected} | Flagged: ${totalFlagged}`);
  if (DRY_RUN) console.log('(Dry run — no changes made)');

  await pool.end();
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

export { main, reviewTip, reviewRecipe };
