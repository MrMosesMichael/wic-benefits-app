import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useI18n } from '@/lib/i18n/I18nContext';
import { getRecipeById } from '@/lib/services/recipeService';
import { colors, fonts, card } from '@/lib/theme';

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: colors.success,
  medium: colors.warning,
  hard: colors.danger,
};

export default function RecipeDetailScreen() {
  const { t, locale } = useI18n();
  const { recipeId } = useLocalSearchParams<{ recipeId: string }>();
  const isEs = locale === 'es';

  const recipe = getRecipeById(recipeId || '');

  if (!recipe) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{t('recipes.notFound')}</Text>
      </View>
    );
  }

  const title = isEs ? recipe.titleEs : recipe.title;
  const wicIngredients = isEs ? recipe.wicIngredientsEs : recipe.wicIngredients;
  const nonWicIngredients = isEs ? recipe.nonWicIngredientsEs : recipe.nonWicIngredients;
  const instructions = isEs ? recipe.instructionsEs : recipe.instructions;
  const diffColor = DIFFICULTY_COLORS[recipe.difficulty] || colors.muted;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.headerCard}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Text style={styles.metaIcon} accessible={false}>⏱️</Text>
            <Text style={styles.metaText}>{recipe.prepTime} {t('recipes.min')}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaIcon} accessible={false}>🍽️</Text>
            <Text style={styles.metaText}>{recipe.servings} {t('recipes.servingsLabel')}</Text>
          </View>
          <View style={[styles.difficultyBadge, { backgroundColor: diffColor }]}>
            <Text style={styles.difficultyText}>{t(`recipes.difficulty.${recipe.difficulty}`)}</Text>
          </View>
        </View>
      </View>

      {/* WIC Ingredients */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle} accessibilityRole="header">
          {t('recipes.wicIngredientsTitle')}
        </Text>
        {wicIngredients.map((ingredient, idx) => (
          <View key={idx} style={styles.ingredientRow}>
            <Text style={styles.wicCheck} accessible={false}>✅</Text>
            <Text style={styles.ingredientText}>{ingredient}</Text>
          </View>
        ))}
      </View>

      {/* Non-WIC Ingredients */}
      {nonWicIngredients.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header">
            {t('recipes.otherIngredients')}
          </Text>
          {nonWicIngredients.map((ingredient, idx) => (
            <View key={idx} style={styles.ingredientRow}>
              <Text style={styles.otherDot} accessible={false}>{'\u2022'}</Text>
              <Text style={styles.ingredientTextLight}>{ingredient}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Instructions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle} accessibilityRole="header">
          {t('recipes.instructions')}
        </Text>
        {instructions.map((step, idx) => (
          <View key={idx} style={styles.stepRow}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>{idx + 1}</Text>
            </View>
            <Text style={styles.stepText}>{step}</Text>
          </View>
        ))}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.screenBg },
  content: { padding: 16 },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  errorText: { fontSize: 16, color: colors.danger },
  headerCard: { ...card, padding: 20, marginBottom: 16 },
  title: { fontSize: 24, fontWeight: 'bold', color: colors.navy, marginBottom: 12 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  metaItem: { flexDirection: 'row', alignItems: 'center' },
  metaIcon: { fontSize: 16, marginRight: 4 },
  metaText: { fontSize: 14, color: colors.muted },
  difficultyBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  difficultyText: { fontSize: 12, fontWeight: '700', color: colors.white },
  section: { ...card, marginBottom: 16 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.navy, marginBottom: 12 },
  ingredientRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  wicCheck: { fontSize: 14, marginRight: 8, marginTop: 2 },
  ingredientText: { fontSize: 15, color: colors.navy, flex: 1, lineHeight: 22 },
  otherDot: { fontSize: 18, color: colors.muted, marginRight: 8, marginTop: -2 },
  ingredientTextLight: { fontSize: 15, color: colors.muted, flex: 1, lineHeight: 22 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  stepNumber: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.wheat, alignItems: 'center', justifyContent: 'center', marginRight: 12, marginTop: 2 },
  stepNumberText: { fontSize: 14, fontWeight: '700', color: colors.white },
  stepText: { fontSize: 15, color: colors.navy, flex: 1, lineHeight: 22 },
});
