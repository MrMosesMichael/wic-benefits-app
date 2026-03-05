import { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useI18n } from '@/lib/i18n/I18nContext';
import {
  getAllRecipes,
  getRecipesByCategory,
  searchRecipes,
  RECIPE_CATEGORIES,
  RecipeCategory,
} from '@/lib/services/recipeService';
import RecipeCard from '@/components/RecipeCard';
import { colors, fonts, card } from '@/lib/theme';

export default function RecipesScreen() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const isEs = locale === 'es';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<RecipeCategory | 'all'>('all');

  const displayedRecipes = useMemo(() => {
    if (searchQuery.trim()) {
      return searchRecipes(searchQuery);
    }
    if (selectedCategory !== 'all') {
      return getRecipesByCategory(selectedCategory);
    }
    return getAllRecipes();
  }, [searchQuery, selectedCategory]);

  const handleRecipePress = (recipeId: string) => {
    router.push({
      pathname: '/community/recipe-detail',
      params: { recipeId },
    });
  };

  const handleAddRecipe = () => {
    router.push('/community/add-recipe');
  };

  return (
    <View style={styles.container}>
      {/* Search + Add Button */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder={t('recipes.searchPlaceholder')}
          placeholderTextColor={colors.muted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel={t('a11y.recipes.searchLabel')}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => setSearchQuery('')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.clearButtonText}>{'\u2715'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Category Chips */}
      {!searchQuery && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chipRow}>
          {RECIPE_CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.chip, selectedCategory === cat.id && styles.chipSelected]}
              onPress={() => setSelectedCategory(cat.id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: selectedCategory === cat.id }}
            >
              <Text style={[styles.chipText, selectedCategory === cat.id && styles.chipTextSelected]}>
                {cat.icon} {t(cat.labelKey)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Recipe List */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {displayedRecipes.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchQuery ? t('recipes.noSearchResults') : t('recipes.noRecipes')}
            </Text>
          </View>
        )}

        {displayedRecipes.map(recipe => (
          <RecipeCard
            key={recipe.id}
            title={isEs ? recipe.titleEs : recipe.title}
            category={recipe.category}
            prepTime={recipe.prepTime}
            servings={recipe.servings}
            difficulty={recipe.difficulty}
            wicIngredientCount={recipe.wicIngredients.length}
            onPress={() => handleRecipePress(recipe.id)}
          />
        ))}

        {/* Add Recipe FAB */}
        <TouchableOpacity
          style={styles.fab}
          onPress={handleAddRecipe}
          accessibilityRole="button"
          accessibilityLabel={t('recipes.addRecipe')}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.screenBg },
  searchContainer: { backgroundColor: colors.cardBg, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center' },
  searchInput: { flex: 1, backgroundColor: colors.screenBg, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, color: colors.navy },
  clearButton: { position: 'absolute', right: 24, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  clearButtonText: { fontSize: 16, color: colors.muted },
  chipScroll: { backgroundColor: colors.cardBg, borderBottomWidth: 1, borderBottomColor: colors.border, maxHeight: 56 },
  chipRow: { paddingHorizontal: 12, paddingVertical: 12, gap: 8, alignItems: 'center' },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.screenBg, marginHorizontal: 4, height: 36, justifyContent: 'center' },
  chipSelected: { backgroundColor: colors.wheat },
  chipText: { fontSize: 13, fontWeight: '500', color: colors.muted },
  chipTextSelected: { color: colors.white },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  emptyContainer: { padding: 20, alignItems: 'center' },
  emptyText: { fontSize: 16, color: colors.muted, fontStyle: 'italic' },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.wheat,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  fabText: {
    fontSize: 28,
    fontWeight: '300',
    color: colors.white,
    marginTop: -2,
  },
});
