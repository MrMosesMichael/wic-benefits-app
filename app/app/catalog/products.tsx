import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useI18n } from '@/lib/i18n/I18nContext';
import { getProducts, lookupUPC, CatalogProduct } from '@/lib/services/catalogService';
import { getCategoryMeta } from '@/lib/data/wic-categories';
import ProductListItem from '@/components/ProductListItem';

export default function ProductsScreen() {
  const { t } = useI18n();
  const { category, state } = useLocalSearchParams<{ category: string; state: string }>();

  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [subcategories, setSubcategories] = useState<string[]>([]);
  const [selectedSub, setSelectedSub] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [totalUnfiltered, setTotalUnfiltered] = useState(0);
  const [brandedOnly, setBrandedOnly] = useState(true);
  const [upcResult, setUpcResult] = useState<{ found: boolean; product?: CatalogProduct } | null>(null);

  const meta = getCategoryMeta(category || '');

  // Detect if search query looks like a UPC (all digits, >= 8 chars)
  const isUpcQuery = /^\d{8,}$/.test(searchQuery.trim());

  useEffect(() => {
    loadProducts(1, true);
  }, [category, state, selectedSub, brandedOnly]);

  // Debounce search — either UPC lookup or regular search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isUpcQuery) {
        handleUpcLookup(searchQuery.trim());
      } else {
        setUpcResult(null);
        loadProducts(1, true);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleUpcLookup = async (upc: string) => {
    setLoading(true);
    setProducts([]);
    try {
      const result = await lookupUPC(upc);
      setUpcResult(result);
      if (result.found && result.product) {
        setProducts([result.product]);
        setTotal(1);
      } else {
        setProducts([]);
        setTotal(0);
      }
    } catch (err) {
      console.error('Failed to lookup UPC:', err);
      setUpcResult({ found: false });
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async (pageNum: number, reset: boolean) => {
    if (reset) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const result = await getProducts({
        state: state || 'MI',
        category: category || undefined,
        subcategory: selectedSub || undefined,
        q: searchQuery || undefined,
        branded: brandedOnly ? 1 : undefined,
        page: pageNum,
        limit: 20,
      });

      if (reset) {
        setProducts(result.products);
        setSubcategories(result.subcategories);
      } else {
        setProducts(prev => [...prev, ...result.products]);
      }

      setTotal(result.total);
      setTotalUnfiltered(result.totalUnfiltered);
      setHasMore(result.hasMore);
      setPage(pageNum);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (hasMore && !loadingMore) {
      loadProducts(page + 1, false);
    }
  };

  const handleSubcategoryPress = (sub: string) => {
    setSelectedSub(selectedSub === sub ? null : sub);
  };

  const renderProduct = ({ item }: { item: CatalogProduct }) => (
    <ProductListItem
      name={item.name}
      brand={item.brand}
      size={item.size}
      category={item.category}
      upc={item.upc}
    />
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#00897B" />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder={t('catalog.searchPlaceholder')}
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel={t('a11y.catalog.searchLabel')}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => setSearchQuery('')}
            accessibilityRole="button"
            accessibilityLabel={t('a11y.catalog.clearSearchLabel')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.clearButtonText}>{'\u2715'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Subcategory Chips — hide if all subcategories are numeric codes */}
      {subcategories.filter(s => !/^\d+$/.test(s)).length > 0 && !searchQuery && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScrollView}
          contentContainerStyle={styles.chipContainer}
        >
          {subcategories.filter(s => !/^\d+$/.test(s)).map(sub => (
            <TouchableOpacity
              key={sub}
              style={[
                styles.chip,
                selectedSub === sub && styles.chipSelected,
              ]}
              onPress={() => handleSubcategoryPress(sub)}
              accessibilityRole="tab"
              accessibilityState={{ selected: selectedSub === sub }}
            >
              <Text
                style={[
                  styles.chipText,
                  selectedSub === sub && styles.chipTextSelected,
                ]}
              >
                {sub}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Branded filter toggle */}
      {!loading && !isUpcQuery && !searchQuery && (
        <View style={styles.brandedToggleRow}>
          <TouchableOpacity
            style={[styles.chip, brandedOnly && styles.chipSelected]}
            onPress={() => setBrandedOnly(true)}
            accessibilityRole="tab"
            accessibilityState={{ selected: brandedOnly }}
          >
            <Text style={[styles.chipText, brandedOnly && styles.chipTextSelected]}>
              {t('catalog.showBranded')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, !brandedOnly && styles.chipSelected]}
            onPress={() => setBrandedOnly(false)}
            accessibilityRole="tab"
            accessibilityState={{ selected: !brandedOnly }}
          >
            <Text style={[styles.chipText, !brandedOnly && styles.chipTextSelected]}>
              {t('catalog.showAll')} ({totalUnfiltered})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* UPC result banner */}
      {!loading && isUpcQuery && upcResult && (
        <View style={[styles.upcBanner, upcResult.found ? styles.upcBannerFound : styles.upcBannerNotFound]}>
          <Text style={styles.upcBannerText}>
            {upcResult.found
              ? t('catalog.upcFound')
              : t('catalog.upcNotFound', { state: state || 'MI' })}
          </Text>
        </View>
      )}

      {/* Results count */}
      {!loading && (
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsCount}>
            {brandedOnly && !searchQuery
              ? t('catalog.showingBranded', { count: total, total: totalUnfiltered })
              : t('catalog.productCount', { count: total })}
          </Text>
        </View>
      )}

      {/* Loading */}
      {loading && (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#00897B" />
        </View>
      )}

      {/* Products List */}
      {!loading && (
        <FlatList
          data={products}
          renderItem={renderProduct}
          keyExtractor={(item, index) => `${item.upc}-${index}`}
          contentContainerStyle={styles.listContent}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{t('catalog.noProducts')}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    position: 'absolute',
    right: 24,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButtonText: {
    fontSize: 16,
    color: '#999',
  },
  chipScrollView: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    maxHeight: 56,
  },
  chipContainer: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 4,
    height: 36,
    justifyContent: 'center',
  },
  chipSelected: {
    backgroundColor: '#00897B',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
  },
  chipTextSelected: {
    color: '#fff',
  },
  brandedToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  upcBanner: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
  },
  upcBannerFound: {
    backgroundColor: '#E8F5E9',
  },
  upcBannerNotFound: {
    backgroundColor: '#FFF3E0',
  },
  upcBannerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  resultsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  resultsCount: {
    fontSize: 13,
    color: '#666',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  footerLoader: {
    padding: 16,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});
