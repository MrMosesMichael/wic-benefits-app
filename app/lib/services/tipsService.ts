import tipsData from '../data/tips.json';

export interface Tip {
  id: string;
  title: string;
  titleEs: string;
  content: string;
  contentEs: string;
  category: string;
  tags: string[];
  priority: number;
}

export type TipCategory = 'shopping' | 'savings' | 'seasonal' | 'checkout' | 'rights';

export const TIP_CATEGORIES: { id: TipCategory; labelKey: string; icon: string; color: string }[] = [
  { id: 'shopping', labelKey: 'tips.categories.shopping', icon: '\u{1F6D2}', color: '#2196F3' },
  { id: 'savings', labelKey: 'tips.categories.savings', icon: '\u{1F4B0}', color: '#4CAF50' },
  { id: 'checkout', labelKey: 'tips.categories.checkout', icon: '\u{1F4B3}', color: '#FF9800' },
  { id: 'rights', labelKey: 'tips.categories.rights', icon: '\u2696\uFE0F', color: '#9C27B0' },
  { id: 'seasonal', labelKey: 'tips.categories.seasonal', icon: '\u{1F33F}', color: '#00897B' },
];

const tips: Tip[] = tipsData as Tip[];

export function getAllTips(): Tip[] {
  return [...tips].sort((a, b) => b.priority - a.priority);
}

export function getTipsByCategory(category: TipCategory): Tip[] {
  return tips
    .filter(t => t.category === category)
    .sort((a, b) => b.priority - a.priority);
}

export function getTipById(id: string): Tip | undefined {
  return tips.find(t => t.id === id);
}

export function searchTips(query: string): Tip[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  const words = q.split(/\s+/);

  return tips
    .map(tip => {
      let score = 0;
      const titleLower = tip.title.toLowerCase();
      const contentLower = tip.content.toLowerCase();

      if (titleLower.includes(q)) score += 100;
      for (const w of words) {
        if (w.length >= 3) {
          if (titleLower.includes(w)) score += 30;
          if (contentLower.includes(w)) score += 10;
        }
      }
      for (const tag of tip.tags) {
        if (q.includes(tag) || tag.includes(q)) score += 50;
        for (const w of words) {
          if (w.length >= 3 && tag.includes(w)) score += 20;
        }
      }
      score += tip.priority / 10;
      return { tip, score };
    })
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(r => r.tip);
}
