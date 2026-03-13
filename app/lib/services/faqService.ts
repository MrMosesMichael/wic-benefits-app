/**
 * FAQ Service
 * Provides FAQ data and search functionality for the Help system
 */
import type { FAQItem, FAQCategory, FAQCategoryInfo, FAQSearchResult } from '@/lib/types/faq';

// Category metadata
export const FAQ_CATEGORIES: FAQCategoryInfo[] = [
  { id: 'eligibility', label: 'Eligibility', icon: '✓', color: '#4CAF50' },
  { id: 'shopping', label: 'Shopping', icon: '🛒', color: '#2196F3' },
  { id: 'formula', label: 'Formula', icon: '🍼', color: '#FF9800' },
  { id: 'benefits', label: 'Benefits', icon: '📋', color: '#9C27B0' },
  { id: 'stores', label: 'Stores', icon: '🏪', color: '#795548' },
  { id: 'app', label: 'Using the App', icon: '📱', color: '#607D8B' },
];

// Initial FAQ data - critical questions that prevent harm/wasted trips
const FAQ_DATA: FAQItem[] = [
  // ELIGIBILITY - Package sizes (CRITICAL)
  {
    id: 'package-sizes',
    question: 'What package sizes are WIC-approved?',
    answer: `WIC approves specific package sizes for each food category. This is one of the most common reasons items get rejected at checkout.

**General Rules:**
• Each state's Approved Product List (APL) specifies exact sizes
• Size must match EXACTLY — close isn't good enough
• Multi-packs may have different rules than single items

**Michigan Examples:**
• Milk: 1/2 gallon or gallon (not quarts)
• Eggs: 1 dozen only (not 18-count)
• Cheese: 8 oz or 16 oz blocks (varies by type)
• Cereal: 12-36 oz boxes (varies by brand)
• Juice: 64 oz bottles (frozen may differ)

**Pro Tip:** Use this app's scanner to verify! It checks both the product AND the size against your state's current APL.`,
    category: 'eligibility',
    tags: ['size', 'package', 'rejected', 'approved', 'APL'],
    priority: 100,
    relatedIds: ['checkout-rejected', 'scan-products'],
  },

  // SHOPPING - Checkout rejection (CRITICAL)
  {
    id: 'checkout-rejected',
    question: 'Why was my item rejected at checkout?',
    answer: `Items can be rejected at checkout for several reasons, even if they seem like they should be WIC-approved:

**Most Common Reasons:**

1. **Wrong Size** — The exact package size isn't on the APL
   • Example: 24 oz cereal when only 18 oz is approved

2. **Wrong Brand** — Store brand vs name brand matters
   • Some items require specific brands
   • Formula is especially strict about brands

3. **Wrong Variety** — Same brand, different product
   • Example: Cheerios ✓ but Honey Nut Cheerios ✗
   • Example: 2% milk ✓ but chocolate milk ✗

4. **Benefits Exhausted** — Already used your allowance
   • Check your remaining benefits in the app

5. **Benefits Expired** — Past your benefit period end date

6. **Store System Error** — Rare, but happens
   • Ask the cashier to re-scan or try another register

**What to Do:**
• Don't argue at checkout — it's stressful and rarely helps
• Note the item and check it in this app later
• Ask for a manager if you believe it's a store error
• Contact your WIC office if it keeps happening`,
    category: 'shopping',
    tags: ['rejected', 'checkout', 'denied', 'error', 'register'],
    priority: 95,
    relatedIds: ['package-sizes', 'benefit-period'],
  },

  // FORMULA - Stock checking (CRITICAL)
  {
    id: 'formula-stock',
    question: 'How do I know if formula is in stock?',
    answer: `Finding formula in stock can be challenging, especially during shortages. Here's how to check:

**Using This App:**
1. Go to the Formula Finder from the home screen
2. Select your formula type
3. See stores with recent stock reports
4. Check confidence scores (higher = more recent/reliable reports)

**Other Methods:**
• Call the store before going
• Check store websites/apps (Walmart, Target, etc.)
• Ask your WIC office — they sometimes get shortage updates

**Understanding Stock Reports:**
• 🟢 "Plenty" — Multiple units available
• 🟡 "Some" — A few units spotted
• 🟠 "Few" — Very limited, go soon
• 🔴 "Out" — None seen

**Report What You See:**
Help other parents! When you shop, report formula stock in the app. Your report helps build a community picture of what's available.

**Formula Shortage Tips:**
• Check multiple stores in your area
• Go early in the morning when shelves are restocked
• Ask about delivery schedules
• Consider equivalent formulas (ask your WIC office first)`,
    category: 'formula',
    tags: ['formula', 'stock', 'inventory', 'shortage', 'availability', 'in stock'],
    priority: 90,
    relatedIds: ['formula-alternatives', 'report-sighting'],
  },

  // BENEFITS - Understanding the three states
  {
    id: 'benefit-states',
    question: 'What do Available, In Cart, and Consumed mean?',
    answer: `Your benefits have three states that help you track usage:

**🟢 Available (Green)**
Benefits you can still use. This is your spending power.

**🟠 In Cart (Amber)**
Items you've added to your cart but haven't purchased yet. This helps you plan your trip without over-buying.

**⬜ Consumed (Gray)**
Benefits you've already used this period. These are spent.

**How It Works:**
1. Start of month: All benefits are Available
2. Add items to cart: Moves from Available → In Cart
3. Log a purchase: Moves from In Cart → Consumed
4. Remove from cart: Moves back from In Cart → Available

**Why This Matters:**
• Prevents embarrassment at checkout from over-shopping
• Helps plan shopping trips
• Shows at a glance what you have left`,
    category: 'benefits',
    tags: ['benefits', 'available', 'cart', 'consumed', 'tracking'],
    priority: 85,
    relatedIds: ['benefit-period', 'manual-entry'],
  },

  // BENEFITS - Benefit period
  {
    id: 'benefit-period',
    question: 'When do my benefits expire?',
    answer: `WIC benefits expire at the end of each benefit period:

**Key Facts:**
• Benefits are typically monthly
• Unused benefits do NOT roll over
• Your period dates are set by your WIC office

**Check Your Dates:**
Go to Benefits → look at the expiration date under each category

**Don't Lose Benefits:**
• Shop before the end date
• Check remaining amounts regularly
• Plan your trips to use everything

**Tip:** Set a reminder a few days before your period ends to use remaining benefits.`,
    category: 'benefits',
    tags: ['expire', 'expiration', 'period', 'monthly', 'rollover'],
    priority: 80,
    relatedIds: ['benefit-states'],
  },

  // SHOPPING - Scanning products
  {
    id: 'scan-products',
    question: 'How do I scan products to check eligibility?',
    answer: `Use the scanner to verify products BEFORE checkout:

**How to Scan:**
1. Tap "Scan Product" on the home screen
2. Point your camera at the barcode
3. Hold steady until it beeps
4. See instant eligibility results

**What You'll See:**
• ✅ Eligible — Good to buy with WIC
• ❌ Not Eligible — Won't work with WIC benefits
• ⚠️ Check Size — Product is WIC-approved but verify the size

**Tips:**
• Scan in the store while shopping
• Check items you're unsure about
• Works offline with Michigan products`,
    category: 'app',
    tags: ['scan', 'scanner', 'barcode', 'check', 'verify'],
    priority: 75,
    relatedIds: ['package-sizes', 'checkout-rejected'],
  },

  // FORMULA - Alternatives
  {
    id: 'formula-alternatives',
    question: 'Can I get a different formula if mine is out of stock?',
    answer: `You may be able to substitute formula, but there are rules:

**Important:** Always contact your WIC office before switching formulas, especially for medical formulas.

**General Guidelines:**
• Same brand, different size: Usually OK
• Different brand, same type: May need approval
• Different formula type: Requires WIC office approval
• Medical/specialty formulas: ALWAYS need approval

**Contract Brand:**
Your state has a "contract brand" that's the default. Switching between contract brand products is usually easier than switching to other brands.

**Michigan Contract Brand:** Currently Similac (as of 2024)

**How to Request a Change:**
1. Call your local WIC office
2. Explain the shortage situation
3. They can update your benefits for approved alternatives

**In the App:**
The Formula Finder shows alternative formulas that may work for your situation.`,
    category: 'formula',
    tags: ['formula', 'alternative', 'substitute', 'switch', 'change', 'shortage'],
    priority: 70,
    relatedIds: ['formula-stock'],
  },

  // APP - Manual entry
  {
    id: 'manual-entry',
    question: 'How do I enter my benefits manually?',
    answer: `If automatic benefit loading isn't available, you can enter benefits from your WIC printout:

**Steps:**
1. Go to Benefits screen
2. Tap "Add Benefits Manually"
3. Select the participant
4. Choose the benefit category
5. Enter the amount from your printout
6. Set your benefit period dates

**Where to Find Your Amounts:**
• Your WIC benefits printout (given at appointments)
• Your eWIC card receipt
• Your state's WIC app or website

**Tip:** Enter benefits right after your WIC appointment when you have the printout handy.`,
    category: 'app',
    tags: ['manual', 'enter', 'entry', 'add', 'benefits', 'setup'],
    priority: 65,
    relatedIds: ['benefit-states', 'household-setup'],
  },

  // APP - Household setup
  {
    id: 'household-setup',
    question: 'How do I set up my household?',
    answer: `Set up your household to track benefits for everyone:

**Steps:**
1. Go to Benefits screen
2. Tap "Setup" or "Set Up Household"
3. Add each participant (pregnant, infant, child, etc.)
4. Enter their name and type
5. Add their benefits

**Participant Types:**
• Pregnant
• Postpartum (not breastfeeding)
• Breastfeeding
• Infant (0-12 months)
• Child (1-5 years)

**Why It Matters:**
Different participants get different benefits. Setting this up correctly ensures accurate tracking.`,
    category: 'app',
    tags: ['household', 'setup', 'participant', 'family', 'add'],
    priority: 60,
    relatedIds: ['manual-entry'],
  },

  // SHOPPING - Partial / fractional benefits
  {
    id: 'partial-benefits',
    question: 'What does a partial benefit amount mean (e.g., 0.75 jar)?',
    answer: `Some WIC benefit amounts are fractions, which can be confusing. Here's what it means and how to use them:

**What Fractional Amounts Mean:**
Your benefit might say something like "0.75 jar of peanut butter." This means you have three-quarters of a full unit to spend.

**How It Works in Practice:**
• Fractional benefits represent dollar value, not literal portions of a jar
• 0.75 of a jar means you can spend 75% of the max price allowed for that item
• If the max allowed is $4.00, you have $3.00 to spend
• You buy a WHOLE jar — the system applies your remaining benefit amount

**Common Fractional Scenarios:**
• You bought some earlier in the month and have a remainder
• Your benefit period overlapped and was prorated
• The household setup allocated a partial amount

**What About Dried Beans vs Canned?**
• WIC lets you choose between dried beans OR canned beans (not both)
• 1 lb dried beans = 4 cans of beans in benefit value
• Partial amounts work the same way for both options
• Check your specific benefit to see which form you have

**Tips for Using Partial Benefits:**
• Check the app for your exact remaining amount before shopping
• Choose a product that fits within your remaining benefit value
• If your partial amount won't cover a full item, it will be combined with your next benefit period (in some states) or you may need to pay the difference out of pocket
• Ask your WIC office if you're unsure

**Pro Tip:** The app shows your exact remaining amount — use it at the store to avoid surprises at checkout!`,
    category: 'benefits',
    tags: ['partial', 'fraction', 'fractional', '0.75', 'peanut butter', 'dried beans', 'remainder', 'amount'],
    priority: 78,
    relatedIds: ['benefit-states', 'benefit-period', 'checkout-rejected'],
  },

  // SHOPPING - Reporting sightings
  {
    id: 'report-sighting',
    question: 'How do I report product availability?',
    answer: `Help other WIC families by reporting what you see in stores:

**How to Report:**
1. Scan a product
2. Tap "Report Stock"
3. Select your store
4. Choose stock level (Plenty, Some, Few, Out)
5. Submit

**Stock Levels:**
• 🟢 Plenty — Good supply, multiple units
• 🟡 Some — Moderate amount
• 🟠 Few — Very limited
• 🔴 Out — None available

**Why Report:**
• Helps other parents find products
• Builds community knowledge
• Reduces wasted trips
• Especially valuable for formula!

**Your reports are anonymous** and help families across your area.`,
    category: 'stores',
    tags: ['report', 'sighting', 'stock', 'inventory', 'crowdsource'],
    priority: 55,
    relatedIds: ['formula-stock'],
  },
];

/**
 * Get all FAQ items
 */
export function getAllFAQs(): FAQItem[] {
  return [...FAQ_DATA].sort((a, b) => b.priority - a.priority);
}

/**
 * Get FAQs by category
 */
export function getFAQsByCategory(category: FAQCategory): FAQItem[] {
  return FAQ_DATA
    .filter((item) => item.category === category)
    .sort((a, b) => b.priority - a.priority);
}

/**
 * Get a single FAQ by ID
 */
export function getFAQById(id: string): FAQItem | undefined {
  return FAQ_DATA.find((item) => item.id === id);
}

/**
 * Get related FAQs for a given FAQ
 */
export function getRelatedFAQs(faqId: string): FAQItem[] {
  const faq = getFAQById(faqId);
  if (!faq || !faq.relatedIds) return [];
  
  return faq.relatedIds
    .map((id) => getFAQById(id))
    .filter((item): item is FAQItem => item !== undefined);
}

/**
 * Search FAQs by query string
 * Returns results sorted by relevance
 */
export function searchFAQs(query: string): FAQSearchResult[] {
  if (!query.trim()) return [];
  
  const normalizedQuery = query.toLowerCase().trim();
  const queryWords = normalizedQuery.split(/\s+/);
  
  const results: FAQSearchResult[] = [];
  
  for (const item of FAQ_DATA) {
    let score = 0;
    
    // Check question match (highest weight)
    const questionLower = item.question.toLowerCase();
    if (questionLower.includes(normalizedQuery)) {
      score += 100;
    } else {
      for (const word of queryWords) {
        if (word.length >= 3 && questionLower.includes(word)) {
          score += 30;
        }
      }
    }
    
    // Check answer match (medium weight)
    const answerLower = item.answer.toLowerCase();
    for (const word of queryWords) {
      if (word.length >= 3 && answerLower.includes(word)) {
        score += 10;
      }
    }
    
    // Check tag match (high weight for exact matches)
    for (const tag of item.tags) {
      if (normalizedQuery.includes(tag) || tag.includes(normalizedQuery)) {
        score += 50;
      }
      for (const word of queryWords) {
        if (word.length >= 3 && tag.includes(word)) {
          score += 20;
        }
      }
    }
    
    // Boost by priority
    score += item.priority / 10;
    
    if (score > 0) {
      results.push({ item, score });
    }
  }
  
  return results.sort((a, b) => b.score - a.score);
}

/**
 * Get category info by ID
 */
export function getCategoryInfo(category: FAQCategory): FAQCategoryInfo | undefined {
  return FAQ_CATEGORIES.find((c) => c.id === category);
}

/**
 * Get all categories with FAQ counts
 */
export function getCategoriesWithCounts(): Array<FAQCategoryInfo & { count: number }> {
  return FAQ_CATEGORIES.map((cat) => ({
    ...cat,
    count: FAQ_DATA.filter((faq) => faq.category === cat.id).length,
  }));
}
