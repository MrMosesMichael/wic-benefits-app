import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useI18n } from '@/lib/i18n/I18nContext';
import { useLocation } from '@/lib/hooks/useLocation';
import { getCategories, CatalogCategory } from '@/lib/services/catalogService';
import { WIC_CATEGORIES, getCategoryMeta, normalizeCategoryId } from '@/lib/data/wic-categories';
import CategoryCard from '@/components/CategoryCard';
import LocationPrompt from '@/components/LocationPrompt';

export default function CatalogScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { location, loading: locationLoading, error: locationError, refresh: refreshLocation, setZipCode } = useLocation();

  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const state = location?.state || 'MI';

  useEffect(() => {
    if (location) {
      loadCategories();
    }
  }, [location?.state]);

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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.subtitle}>
          {t('catalog.browsingState', { state: stateNames[state] || state })}
        </Text>
      </View>

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
      {loading && (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#00897B" />
          <Text style={styles.loadingText}>{t('catalog.loading')}</Text>
        </View>
      )}

      {/* Error */}
      {error && !loading && (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* No network message */}
      {!loading && !error && location && categories.length === 0 && (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyIcon} accessible={false}>📋</Text>
          <Text style={styles.emptyTitle}>{t('catalog.requiresInternet')}</Text>
          <Text style={styles.emptyText}>{t('catalog.requiresInternetMessage')}</Text>
        </View>
      )}

      {/* Category Grid */}
      {!loading && categories.length > 0 && (
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
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
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
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#F44336',
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  grid: {
    padding: 12,
  },
  row: {
    justifyContent: 'space-between',
  },
});
