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

export function getCategoryMeta(categoryId: string): WicCategory | undefined {
  return WIC_CATEGORIES.find(c => c.id === categoryId);
}
