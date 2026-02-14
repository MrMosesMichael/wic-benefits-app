import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from '@/lib/i18n/I18nContext';

interface RecipeCardProps {
  title: string;
  category: string;
  prepTime: number;
  servings: number;
  difficulty: string;
  wicIngredientCount: number;
  onPress: () => void;
}

const CATEGORY_ICONS: Record<string, string> = {
  breakfast: '\u{1F373}',
  lunch: '\u{1F96A}',
  dinner: '\u{1F35D}',
  snacks: '\u{1F34E}',
  baby_food: '\u{1F476}',
};

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: '#4CAF50',
  medium: '#FF9800',
  hard: '#F44336',
};

export default function RecipeCard({ title, category, prepTime, servings, difficulty, wicIngredientCount, onPress }: RecipeCardProps) {
  const t = useTranslation();
  const icon = CATEGORY_ICONS[category] || '\u{1F372}';
  const diffColor = DIFFICULTY_COLORS[difficulty] || '#666';

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${prepTime} ${t('recipes.minutes')}, ${servings} ${t('recipes.servingsLabel')}`}
      accessibilityHint={t('a11y.recipes.cardHint')}
    >
      <Text style={styles.icon} accessible={false} importantForAccessibility="no">{icon}</Text>
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>{title}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>{prepTime} {t('recipes.min')}</Text>
          <Text style={styles.metaDot}>{'\u00B7'}</Text>
          <Text style={styles.meta}>{servings} {t('recipes.servingsShort')}</Text>
          <Text style={styles.metaDot}>{'\u00B7'}</Text>
          <Text style={[styles.difficulty, { color: diffColor }]}>{t(`recipes.difficulty.${difficulty}`)}</Text>
        </View>
        <View style={styles.wicBadge}>
          <Text style={styles.wicBadgeText}>{wicIngredientCount} {t('recipes.wicIngredients')}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  icon: {
    fontSize: 36,
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  meta: {
    fontSize: 12,
    color: '#666',
  },
  metaDot: {
    fontSize: 12,
    color: '#ccc',
    marginHorizontal: 6,
  },
  difficulty: {
    fontSize: 12,
    fontWeight: '600',
  },
  wicBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  wicBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2E7D32',
  },
});
