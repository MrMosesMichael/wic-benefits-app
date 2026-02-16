import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from '@/lib/i18n/I18nContext';
import { formatCategoryName } from '@/lib/data/wic-categories';

interface CategoryCardProps {
  categoryId: string;
  icon: string;
  color: string;
  labelKey: string;
  count: number;
  onPress: () => void;
}

export default function CategoryCard({ categoryId, icon, color, labelKey, count, onPress }: CategoryCardProps) {
  const t = useTranslation();

  // Use i18n key if it resolves, otherwise format the raw category name
  const translated = t(labelKey);
  const label = translated.startsWith('[missing') ? formatCategoryName(categoryId) : translated;

  return (
    <TouchableOpacity
      style={[styles.card, { borderTopColor: color }]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${count} ${t('catalog.items')}`}
      accessibilityHint={t('a11y.catalog.categoryHint')}
    >
      <Text style={styles.icon} accessible={false} importantForAccessibility="no">{icon}</Text>
      <Text style={styles.name} numberOfLines={2}>{label}</Text>
      <Text style={styles.count}>{count} {t('catalog.items')}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    flex: 1,
    margin: 4,
    minHeight: 120,
    justifyContent: 'center',
  },
  icon: {
    fontSize: 32,
    marginBottom: 8,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  count: {
    fontSize: 12,
    color: '#666',
  },
});
