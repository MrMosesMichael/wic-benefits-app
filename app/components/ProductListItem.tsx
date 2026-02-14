import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from '@/lib/i18n/I18nContext';

interface ProductListItemProps {
  name: string;
  brand: string;
  size: string;
  category: string;
}

export default function ProductListItem({ name, brand, size, category }: ProductListItemProps) {
  const t = useTranslation();

  return (
    <View
      style={styles.card}
      accessibilityLabel={`${name}${brand ? `, ${brand}` : ''}${size ? `, ${size}` : ''}`}
    >
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={2}>{name}</Text>
        {brand ? <Text style={styles.brand}>{brand}</Text> : null}
        {size ? <Text style={styles.size}>{size}</Text> : null}
      </View>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{t('catalog.wicApproved')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    lineHeight: 20,
  },
  brand: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  size: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  badge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2E7D32',
  },
});
