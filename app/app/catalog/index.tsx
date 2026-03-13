import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useI18n } from '@/lib/i18n/I18nContext';
import { useLocation } from '@/lib/hooks/useLocation';
import { getCategories, getProducts, CatalogCategory, CatalogProduct } from '@/lib/services/catalogService';
import { getCategoryMeta, normalizeCategoryId } from '@/lib/data/wic-categories';
import CategoryCard from '@/components/CategoryCard';
import ProductListItem from '@/components/ProductListItem';
import LocationPrompt from '@/components/LocationPrompt';
import { colors } from '@/lib/theme';

export default function CatalogScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { location, loading: locationLoading, error: locationError, refresh: refreshLocation, setZipCode } = useLocation();

  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Global search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CatalogProduct[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchTotal, setSearchTotal] = useState(0);
  const [searchPage, setSearchPage] = useState(1);
  const [searchHasMore, setSearchHasMore] = useState(false);
  const [searchLoadingMore, setSearchLoadingMore] = useState(false);

  const state = location?.state || 'MI';
  const isSearching = searchQuery.trim().length > 0;

  useEffect(() => {
    if (location) {
      loadCategories();
    }
  }, [location?.state]);

  // Debounced search across all categories
  useEffect(() => {
    if (!isSearching) {
      setSearchResults([]);
      setSearchTotal(0);
      return;
    }
    const timer = setTimeout(() => {
      loadSearchResults(1, true);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const cats = await getCategories(state);
      setCategories(cats);
    } catch (err) {
      setError(t('catalog.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const loadSearchResults = async (pageNum: number, reset: boolean) => {
    if (reset) {
      setSearchLoading(true);
    } else {
      setSearchLoadingMore(true);
    }
    try {
      const result = await getProducts({
        state,
        q: searchQuery.trim(),
        page: pageNum,
        limit: 20,
      });
      if (reset) {
        setSearchResults(result.products);
      } else {
        setSearchResults(prev => [...prev, ...result.products]);
      }
      setSearchTotal(result.total);
      setSearchHasMore(result.hasMore);
      setSearchPage(pageNum);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setSearchLoading(false);
      setSearchLoadingMore(false);
    }
  };

  const handleSearchLoadMore = () => {
    if (searchHasMore && !searchLoadingMore) {
      loadSearchResults(searchPage + 1, false);
    }
  };

  const handleCategoryPress = (category: string) => {
    router.push({
      pathname: '/catalog/products',
      params: { category, state },
    });
  };

  const stateNames: Record<string, string> = {
    MI: 'Michigan',
    NC: 'North Carolina',
    NY: 'New York',
    OR: 'Oregon',
  };

  const renderCategory = ({ item }: { item: CatalogCategory }) => {
    const normalizedId = normalizeCategoryId(item.category);
    const meta = getCategoryMeta(item.category);
    return (
      <CategoryCard
        categoryId={item.category}
        icon={meta?.icon || '\u{1F4E6}'}
        color={meta?.color || '#78909C'}
        labelKey={meta?.labelKey || `catalog.categories.${normalizedId}`}
        count={item.count}
        onPress={() => handleCategoryPress(item.category)}
      />
    );
  };

  const renderSearchProduct = ({ item }: { item: CatalogProduct }) => (
    <ProductListItem
      name={item.name}
      brand={item.brand}
      size={item.size}
      category={item.category}
      upc={item.upc}
    />
  );

  const renderSearchFooter = () => {
    if (!searchLoadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.navy} />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.subtitle}>
          {t('catalog.browsingState', { state: stateNames[state] || state })}
        </Text>
      </View>

      {/* Global Search Bar */}
      {location && (
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder={t('catalog.searchAllPlaceholder')}
            placeholderTextColor={colors.muted}
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
      )}

      {/* Location Prompt */}
      {!location && !locationLoading && (
        <LocationPrompt
          onGPS={refreshLocation}
          onZipCode={setZipCode}
          loading={locationLoading}
          error={locationError}
        />
      )}

      {/* Loading */}
      {loading && !isSearching && (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.navy} />
          <Text style={styles.loadingText}>{t('catalog.loading')}</Text>
        </View>
      )}

      {/* Error */}
      {error && !loading && !isSearching && (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* No network message */}
      {!loading && !error && location && categories.length === 0 && !isSearching && (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyIcon} accessible={false}>📋</Text>
          <Text style={styles.emptyTitle}>{t('catalog.requiresInternet')}</Text>
          <Text style={styles.emptyText}>{t('catalog.requiresInternetMessage')}</Text>
        </View>
      )}

      {/* Search Results */}
      {isSearching && searchLoading && (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.navy} />
        </View>
      )}

      {isSearching && !searchLoading && (
        <>
          <View style={styles.searchResultsHeader}>
            <Text style={styles.searchResultsCount}>
              {t('catalog.productCount', { count: searchTotal })}
            </Text>
          </View>
          <FlatList
            data={searchResults}
            renderItem={renderSearchProduct}
            keyExtractor={(item, index) => `${item.upc}-${index}`}
            contentContainerStyle={styles.searchListContent}
            onEndReached={handleSearchLoadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={renderSearchFooter}
            ListEmptyComponent={
              <View style={styles.centerContainer}>
                <Text style={styles.emptyText}>{t('catalog.noProducts')}</Text>
              </View>
            }
          />
        </>
      )}

      {/* Category Grid */}
      {!loading && !isSearching && categories.length > 0 && (
        <FlatList
          data={categories}
          renderItem={renderCategory}
          keyExtractor={item => item.category}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.screenBg,
  },
  header: {
    backgroundColor: colors.cardBg,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  subtitle: {
    fontSize: 14,
    color: colors.muted,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.muted,
  },
  errorText: {
    fontSize: 16,
    color: colors.danger,
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.navy,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
  },
  searchContainer: {
    backgroundColor: colors.cardBg,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchInput: {
    flex: 1,
    backgroundColor: colors.screenBg,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.navy,
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
    color: colors.muted,
  },
  searchResultsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchResultsCount: {
    fontSize: 13,
    color: colors.muted,
  },
  searchListContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  footerLoader: {
    padding: 16,
    alignItems: 'center',
  },
  grid: {
    padding: 12,
  },
  row: {
    justifyContent: 'space-between',
  },
});
