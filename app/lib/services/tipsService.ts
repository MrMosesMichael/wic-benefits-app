import axios from 'axios';
import tipsData from '../data/tips.json';

const API_BASE_URL = __DEV__
  ? 'http://192.168.12.94:3000/api/v1'
  : 'https://mdmichael.com/wic/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

export interface Tip {
  id: string;
  title: string;
  titleEs: string;
  content: string;
  contentEs: string;
  category: string;
  tags: string[];
  priority: number;
  /** Only present on bundled tips */
  isBundled?: boolean;
}

export interface CommunityTip {
  id: number;
  title: string;
  content: string;
  category: string;
  tags: string[];
  submittedBy: string;
  status: string;
  upvotes: number;
  downvotes: number;
  netScore: number;
  flagCount: number;
  createdAt: string;
  /** Always true for community tips in merged lists */
  isCommunity?: boolean;
}

/** Union type for display: bundled or community */
export type DisplayTip = (Tip & { isBundled: true; isCommunity?: false }) | (CommunityTip & { isCommunity: true; isBundled?: false });

export type TipCategory = 'shopping' | 'savings' | 'seasonal' | 'checkout' | 'rights' | 'guidelines';

export const TIP_CATEGORIES: { id: TipCategory; labelKey: string; icon: string; color: string }[] = [
  { id: 'shopping', labelKey: 'tips.categories.shopping', icon: '\u{1F6D2}', color: '#2196F3' },
  { id: 'savings', labelKey: 'tips.categories.savings', icon: '\u{1F4B0}', color: '#4CAF50' },
  { id: 'checkout', labelKey: 'tips.categories.checkout', icon: '\u{1F4B3}', color: '#FF9800' },
  { id: 'rights', labelKey: 'tips.categories.rights', icon: '\u2696\uFE0F', color: '#9C27B0' },
  { id: 'seasonal', labelKey: 'tips.categories.seasonal', icon: '\u{1F33F}', color: '#00897B' },
  { id: 'guidelines', labelKey: 'tips.categories.guidelines', icon: '\u{1F4CB}', color: '#1976D2' },
];

const tips: Tip[] = tipsData as Tip[];

// ─── Bundled (static) tip helpers ────────────────────────

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

// ─── Community (API) tip helpers ─────────────────────────

export async function getCommunityTips(
  category?: string,
  page: number = 0,
  limit: number = 50
): Promise<{ tips: CommunityTip[]; total: number; hasMore: boolean }> {
  try {
    const params: any = { limit, offset: page * limit };
    if (category && category !== 'all') params.category = category;

    const response = await api.get('/tips', { params });
    return {
      tips: response.data.tips || [],
      total: response.data.total || 0,
      hasMore: response.data.hasMore || false,
    };
  } catch (error) {
    console.error('Failed to fetch community tips:', error);
    return { tips: [], total: 0, hasMore: false };
  }
}

export async function submitTip(
  title: string,
  content: string,
  category: string,
  submittedBy?: string
): Promise<{ success: boolean; tip?: CommunityTip; error?: string }> {
  try {
    const response = await api.post('/tips', { title, content, category, submittedBy });
    return { success: true, tip: response.data.tip };
  } catch (error: any) {
    const message = error.response?.data?.error || 'Failed to submit tip';
    return { success: false, error: message };
  }
}

export async function voteTip(
  tipId: number,
  voteType: 'up' | 'down',
  voterId: string
): Promise<{ success: boolean; action?: string; voteType?: string | null; error?: string }> {
  try {
    const response = await api.post(`/tips/${tipId}/vote`, { voteType, voterId });
    return {
      success: true,
      action: response.data.action,
      voteType: response.data.voteType,
    };
  } catch (error: any) {
    const message = error.response?.data?.error || 'Failed to vote';
    return { success: false, error: message };
  }
}

export async function flagTip(
  tipId: number,
  flaggerId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await api.post(`/tips/${tipId}/flag`, { flaggerId, reason });
    return { success: true };
  } catch (error: any) {
    const message = error.response?.data?.error || 'Failed to flag tip';
    return { success: false, error: message };
  }
}

/**
 * Merge bundled tips with community tips for display.
 * Bundled tips appear first (sorted by priority), followed by community tips (sorted by netScore).
 */
export async function getAllTipsWithCommunity(
  category?: string
): Promise<DisplayTip[]> {
  // Get bundled tips
  const bundled: DisplayTip[] = (category && category !== 'all'
    ? getTipsByCategory(category as TipCategory)
    : getAllTips()
  ).map(t => ({ ...t, isBundled: true as const }));

  // Get community tips
  try {
    const { tips: communityTips } = await getCommunityTips(category);
    const community: DisplayTip[] = communityTips.map(t => ({ ...t, isCommunity: true as const }));
    return [...bundled, ...community];
  } catch {
    return bundled;
  }
}
