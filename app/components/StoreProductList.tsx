import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from '@/lib/i18n/I18nContext';
import { getStoreProducts } from '@/lib/services/api';
import { colors } from '@/lib/theme';

interface StoreProduct {
  upc: string;
  status: string;
  productName: string | null;
  brand: string | null;
  category: string | null;
  size: string | null;
  unit: string | null;
  lastUpdated: string;
}

interface StoreProductListProps {
  storeId: string;
  chain: string;
}

const STATUS_INFO: Record<string, { color: string; bgColor: string; label: string }> = {
  in_stock: { color: colors.success, bgColor: '#E8F5E9', label: 'In Stock' },
  low_stock: { color: colors.warning, bgColor: '#FFF3E0', label: 'Low Stock' },
  out_of_stock: { color: colors.danger, bgColor: '#FFEBEE', label: 'Out of Stock' },
  unknown: { color: colors.muted, bgColor: colors.screenBg, label: 'Unknown' },
};

const CATEGORY_FILTERS = ['all', 'milk', 'cereal', 'infant_food', 'eggs', 'cheese', 'juice', 'whole_grains'];

export default function StoreProductList({ storeId, chain }: StoreProductListProps) {
  const t = useTranslation();
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    loadProducts();
  }, [storeId, selectedCategory]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const category = selectedCategory === 'all' ? undefined : selectedCategory;
      const result = await getStoreProducts(storeId, { category, limit: 50 });
      setProducts(result.products);
      setHasData(result.total > 0);
    } catch (error) {
      console.error('Failed to load store products:', error);
      setHasData(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.muted} />
        <Text style={styles.loadingText}>{t('storeProducts.loading')}</Text>
      </View>
    );
  }

  if (!hasData) {
    const isKroger = chain.toLowerCase().includes('kroger') ||
                     chain.toLowerCase().includes('fred meyer') ||
                     chain.toLowerCase().includes('fry') ||
                     chain.toLowerCase().includes('ralphs');
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>📦</Text>
        <Text style={styles.emptyTitle}>{t('storeProducts.noInventory')}</Text>
        <Text style={styles.emptyText}>
          {isKroger ? t('storeProducts.noInventoryKroger') : t('storeProducts.noInventoryGeneral')}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Category Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipScroll}
        contentContainerStyle={styles.chipRow}
      >
        {CATEGORY_FILTERS.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.chip, selectedCategory === cat && styles.chipActive]}
            onPress={() => setSelectedCategory(cat)}
            accessibilityRole="tab"
            accessibilityState={{ selected: selectedCategory === cat }}
          >
            <Text style={[styles.chipText, selectedCategory === cat && styles.chipTextActive]}>
              {cat === 'all' ? t('storeProducts.allProducts') : t(`catalog.categories.${cat}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Product Cards */}
      {products.length === 0 ? (
        <Text style={styles.noProductsText}>{t('storeProducts.noProductsCategory')}</Text>
      ) : (
        products.map((product) => {
          const statusInfo = STATUS_INFO[product.status] || STATUS_INFO.unknown;
          return (
            <View key={product.upc} style={styles.productCard}>
              <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={2}>
                  {product.brand && product.productName
                    ? `${product.brand} ${product.productName}`
                    : product.productName || product.upc}
                </Text>
                {product.size && (
                  <Text style={styles.productSize}>
                    {product.size} {product.unit || ''}
                  </Text>
                )}
              </View>
              <View style={[styles.statusBadge, { backgroundColor: statusInfo.bgColor }]}>
                <View style={[styles.statusDot, { backgroundColor: statusInfo.color }]} />
                <Text style={[styles.statusText, { color: statusInfo.color }]}>
                  {statusInfo.label}
                </Text>
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 13,
    color: colors.muted,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.navy,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 18,
  },
  chipScroll: {
    marginBottom: 12,
    maxHeight: 40,
  },
  chipRow: {
    gap: 6,
    paddingHorizontal: 2,
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.screenBg,
  },
  chipActive: {
    backgroundColor: colors.navy,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.muted,
  },
  chipTextActive: {
    color: colors.white,
  },
  noProductsText: {
    fontSize: 13,
    color: colors.muted,
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 16,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  productInfo: {
    flex: 1,
    marginRight: 12,
  },
  productName: {
    fontSize: 14,
    color: colors.navy,
    fontWeight: '500',
  },
  productSize: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
