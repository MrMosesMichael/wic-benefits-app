export interface WicCategory {
  id: string;
  icon: string;
  color: string;
  labelKey: string;
}

export const WIC_CATEGORIES: WicCategory[] = [
  { id: 'milk', icon: '\u{1F95B}', color: '#42A5F5', labelKey: 'catalog.categories.milk' },
  { id: 'eggs', icon: '\u{1F95A}', color: '#FFA726', labelKey: 'catalog.categories.eggs' },
  { id: 'cereal', icon: '\u{1F35E}', color: '#8D6E63', labelKey: 'catalog.categories.cereal' },
  { id: 'peanut_butter', icon: '\u{1F95C}', color: '#A1887F', labelKey: 'catalog.categories.peanut_butter' },
  { id: 'juice', icon: '\u{1F9C3}', color: '#FF7043', labelKey: 'catalog.categories.juice' },
  { id: 'cheese', icon: '\u{1F9C0}', color: '#FFCA28', labelKey: 'catalog.categories.cheese' },
  { id: 'whole_grains', icon: '\u{1F33E}', color: '#9CCC65', labelKey: 'catalog.categories.whole_grains' },
  { id: 'infant_formula', icon: '\u{1F37C}', color: '#EC407A', labelKey: 'catalog.categories.infant_formula' },
  { id: 'infant_food', icon: '\u{1F476}', color: '#AB47BC', labelKey: 'catalog.categories.infant_food' },
  { id: 'fruits_vegetables', icon: '\u{1F34E}', color: '#66BB6A', labelKey: 'catalog.categories.fruits_vegetables' },
  { id: 'uncategorized', icon: '\u{1F4E6}', color: '#78909C', labelKey: 'catalog.categories.uncategorized' },
];

/**
 * Map raw APL category strings to our normalized IDs.
 * APL spreadsheets use human-readable category names like "Milk, Whole"
 * which need to be mapped to our IDs like "milk".
 */
const CATEGORY_ALIASES: Record<string, string> = {
  // Milk variants
  'milk': 'milk', 'milk, whole': 'milk', 'milk, reduced fat': 'milk', 'milk, fat free': 'milk',
  'milk, lowfat': 'milk', 'milk, skim': 'milk', 'milk, 1%': 'milk', 'milk, 2%': 'milk',
  'fluid milk': 'milk', 'dairy': 'milk', 'soy milk': 'milk', 'lactose free milk': 'milk',
  // Eggs
  'eggs': 'eggs', 'egg': 'eggs', 'eggs, large': 'eggs',
  // Cereal
  'cereal': 'cereal', 'cereal, hot': 'cereal', 'cereal, cold': 'cereal',
  'infant cereal': 'cereal', 'adult cereal': 'cereal', 'breakfast cereal': 'cereal',
  // Peanut butter
  'peanut butter': 'peanut_butter', 'peanut_butter': 'peanut_butter', 'pb': 'peanut_butter',
  // Juice
  'juice': 'juice', 'juice, frozen': 'juice', 'juice, shelf stable': 'juice',
  'juice, frozen conc.': 'juice', 'juice, frozen concentrate': 'juice',
  '100% juice': 'juice', 'fruit juice': 'juice',
  // Cheese
  'cheese': 'cheese', 'cheese, domestic': 'cheese', 'cheese, block': 'cheese',
  // Whole grains
  'whole grains': 'whole_grains', 'whole_grains': 'whole_grains',
  'bread': 'whole_grains', 'whole wheat bread': 'whole_grains',
  'tortillas': 'whole_grains', 'brown rice': 'whole_grains', 'pasta': 'whole_grains',
  // Infant formula
  'infant formula': 'infant_formula', 'infant_formula': 'infant_formula',
  'formula': 'infant_formula', 'baby formula': 'infant_formula',
  // Infant food
  'infant food': 'infant_food', 'infant_food': 'infant_food',
  'baby food': 'infant_food', 'infant fruits & vegetables': 'infant_food',
  'infant meats': 'infant_food',
  // Fruits & vegetables
  'fruits & vegetables': 'fruits_vegetables', 'fruits_vegetables': 'fruits_vegetables',
  'fruits and vegetables': 'fruits_vegetables', 'fresh fruits & vegetables': 'fruits_vegetables',
  'cvv': 'fruits_vegetables', 'cash value voucher': 'fruits_vegetables',
  'cash value benefit': 'fruits_vegetables', 'cvb': 'fruits_vegetables',
  'produce': 'fruits_vegetables',
};

export function normalizeCategoryId(raw: string): string {
  const lower = raw.toLowerCase().trim();
  if (CATEGORY_ALIASES[lower]) return CATEGORY_ALIASES[lower];
  // Try prefix matching (e.g., "Milk, Whole 1 Gallon" starts with "milk")
  for (const [alias, id] of Object.entries(CATEGORY_ALIASES)) {
    if (lower.startsWith(alias)) return id;
  }
  return raw;
}

export function getCategoryMeta(categoryId: string): WicCategory | undefined {
  // Try exact match first
  const exact = WIC_CATEGORIES.find(c => c.id === categoryId);
  if (exact) return exact;
  // Try normalized match
  const normalized = normalizeCategoryId(categoryId);
  return WIC_CATEGORIES.find(c => c.id === normalized);
}

/**
 * Format a raw category string as a readable display name
 * when no i18n key exists.
 */
export function formatCategoryName(raw: string): string {
  return raw
    .replace(/_/g, ' ')
    .replace(/,\s*/g, ' - ')
    .replace(/\b\w/g, c => c.toUpperCase());
}
