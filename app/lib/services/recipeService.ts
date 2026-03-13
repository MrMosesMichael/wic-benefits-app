import recipesData from '../data/recipes.json';
import { getCommunityRecipes as fetchCommunityRecipesAPI } from './api';

export interface Recipe {
  id: string;
  title: string;
  titleEs: string;
  category: string;
  prepTime: number;
  servings: number;
  difficulty: string;
  wicIngredients: string[];
  wicIngredientsEs: string[];
  nonWicIngredients: string[];
  nonWicIngredientsEs: string[];
  instructions: string[];
  instructionsEs: string[];
  /** True for bundled (official) recipes */
  isBundled?: boolean;
  /** True for community-submitted recipes */
  isCommunity?: boolean;
}

export interface CommunityRecipe {
  id: number;
  title: string;
  titleEs: string | null;
  category: string;
  prepTime: number;
  servings: number;
  difficulty: string;
  wicIngredients: string[];
  nonWicIngredients: string[];
  instructions: string[];
  submittedBy: string;
  isBundled: boolean;
  status: string;
  upvotes: number;
  downvotes: number;
  netScore: number;
  flagCount: number;
  createdAt: string;
  updatedAt: string;
  /** Always true for community recipes in merged lists */
  isCommunity?: boolean;
}

/** Union type for display: bundled or community */
export type DisplayRecipe = (Recipe & { isBundled: true; isCommunity?: false }) | (CommunityRecipe & { isCommunity: true; isBundled?: false });

export type RecipeCategory = 'breakfast' | 'lunch' | 'dinner' | 'snacks' | 'baby_food';

export const RECIPE_CATEGORIES: { id: RecipeCategory | 'all'; labelKey: string; icon: string }[] = [
  { id: 'all', labelKey: 'recipes.categories.all', icon: '\u{1F372}' },
  { id: 'breakfast', labelKey: 'recipes.categories.breakfast', icon: '\u{1F373}' },
  { id: 'lunch', labelKey: 'recipes.categories.lunch', icon: '\u{1F96A}' },
  { id: 'dinner', labelKey: 'recipes.categories.dinner', icon: '\u{1F35D}' },
  { id: 'snacks', labelKey: 'recipes.categories.snacks', icon: '\u{1F34E}' },
  { id: 'baby_food', labelKey: 'recipes.categories.baby_food', icon: '\u{1F476}' },
];

const recipes: Recipe[] = recipesData as Recipe[];

// ─── Bundled (static) recipe helpers ────────────────────────

export function getAllRecipes(): Recipe[] {
  return recipes;
}

export function getRecipesByCategory(category: RecipeCategory): Recipe[] {
  return recipes.filter(r => r.category === category);
}

export function getRecipeById(id: string): Recipe | undefined {
  return recipes.find(r => r.id === id);
}

export function searchRecipes(query: string): Recipe[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  return recipes.filter(
    r =>
      r.title.toLowerCase().includes(q) ||
      r.titleEs.toLowerCase().includes(q) ||
      r.wicIngredients.some(i => i.toLowerCase().includes(q)) ||
      r.nonWicIngredients.some(i => i.toLowerCase().includes(q))
  );
}

// ─── Community (API) recipe helpers ─────────────────────────

/**
 * Fetch approved community recipes from the backend API
 */
export async function getCommunityRecipes(
  category?: string
): Promise<{ recipes: CommunityRecipe[]; total: number }> {
  try {
    const options: any = { source: 'community' };
    if (category && category !== 'all') options.category = category;
    const result = await fetchCommunityRecipesAPI(options);
    const communityRecipes: CommunityRecipe[] = (result.recipes || []).map((r: any) => ({
      ...r,
      isCommunity: true,
    }));
    return { recipes: communityRecipes, total: result.total };
  } catch (error) {
    console.error('Failed to fetch community recipes:', error);
    return { recipes: [], total: 0 };
  }
}

/**
 * Merge bundled recipes with community recipes for display.
 * Bundled recipes appear first, followed by community recipes (sorted by newest).
 */
export async function getAllRecipesWithCommunity(
  category?: string
): Promise<DisplayRecipe[]> {
  // Get bundled recipes
  const bundled: DisplayRecipe[] = (category && category !== 'all'
    ? getRecipesByCategory(category as RecipeCategory)
    : getAllRecipes()
  ).map(r => ({ ...r, isBundled: true as const }));

  // Get community recipes
  try {
    const { recipes: communityRecipes } = await getCommunityRecipes(category);
    const community: DisplayRecipe[] = communityRecipes.map(r => ({ ...r, isCommunity: true as const }));
    return [...bundled, ...community];
  } catch {
    return bundled;
  }
}
