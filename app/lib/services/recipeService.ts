import recipesData from '../data/recipes.json';

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
}

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
