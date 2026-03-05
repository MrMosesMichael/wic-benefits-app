import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useI18n } from '@/lib/i18n/I18nContext';
import { useLocation } from '@/lib/hooks/useLocation';
import { searchStores, getChains, StoreFinderStore } from '@/lib/services/storeFinderService';
import LocationPrompt from '@/components/LocationPrompt';
import { colors, fonts, card } from '@/lib/theme';

export default function StoreFinderScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { location, loading: locationLoading, error: locationError, refresh: refreshLocation, setZipCode } = useLocation();

  const [stores, setStores] = useState<StoreFinderStore[]>([]);
  const [chains, setChains] = useState<{ id: string; displayName: string; storeCount: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [searchRadius, setSearchRadius] = useState(10);
  const [selectedChain, setSelectedChain] = useState<string | null>(null);
  const [wicOnly, setWicOnly] = useState(true);

  useEffect(() => {
    loadChains();
  }, []);

  useEffect(() => {
    if (location) {
      handleSearch();
    }
  }, [location?.lat, location?.lng]);

  const loadChains = async () => {
    try {
      const c = await getChains();
      setChains(c);
    } catch (err) {
      console.error('Failed to load chains:', err);
    }
  };

  const handleSearch = async () => {
    if (!location) return;
    try {
      setLoading(true);
      const results = await searchStores(
        location.lat,
        location.lng,
        searchRadius,
        selectedChain || undefined,
        wicOnly
      );
      setStores(results);
    } catch (err) {
      console.error('Failed to search stores:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone.replace(/[^\d]/g, '')}`);
  };

  const handleDirections = (store: StoreFinderStore) => {
    const address = `${store.address.street}, ${store.address.city}, ${store.address.state} ${store.address.zip}`;
    const url = Platform.select({
      ios: `maps://app?daddr=${encodeURIComponent(address)}`,
      android: `geo:${store.location.latitude},${store.location.longitude}?q=${encodeURIComponent(address)}`,
    });
    if (url) Linking.openURL(url);
  };

  const handleStorePress = (store: StoreFinderStore) => {
    router.push({
      pathname: '/stores/detail',
      params: {
        name: store.name,
        chain: store.chain,
        street: store.address.street,
        city: store.address.city,
        state: store.address.state,
        zip: store.address.zip,
        phone: store.phone || '',
        wicAuthorized: store.wicAuthorized ? '1' : '0',
        lat: store.location.latitude.toString(),
        lng: store.location.longitude.toString(),
        distance: store.distanceMiles?.toString() || '',
        storeId: store.storeId || '',
      },
    });
  };

  return (
    <View style={styles.container}>
      {/* Map/List Toggle */}
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}
          onPress={() => setViewMode('list')}
          accessibilityRole="tab"
          accessibilityState={{ selected: viewMode === 'list' }}
        >
          <Text style={[styles.toggleBtnText, viewMode === 'list' && styles.toggleBtnTextActive]}>
            {t('storeFinder.listView')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, viewMode === 'map' && styles.toggleBtnActive]}
          onPress={() => setViewMode('map')}
          accessibilityRole="tab"
          accessibilityState={{ selected: viewMode === 'map' }}
        >
          <Text style={[styles.toggleBtnText, viewMode === 'map' && styles.toggleBtnTextActive]}>
            {t('storeFinder.mapView')}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Filters */}
        <View style={styles.filtersCard}>
          {/* Radius */}
          <Text style={styles.filterTitle}>{t('storeFinder.searchRadius')}</Text>
          <View style={styles.radiusRow}>
            {[5, 10, 25].map(r => (
              <TouchableOpacity
                key={r}
                style={[styles.radiusBtn, searchRadius === r && styles.radiusBtnActive]}
                onPress={() => setSearchRadius(r)}
                accessibilityRole="radio"
                accessibilityState={{ selected: searchRadius === r }}
              >
                <Text style={[styles.radiusBtnText, searchRadius === r && styles.radiusBtnTextActive]}>
                  {r} {t('units.mi')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* WIC Only Toggle */}
          <TouchableOpacity
            style={[styles.toggleFilter, wicOnly && styles.toggleFilterActive]}
            onPress={() => setWicOnly(!wicOnly)}
            accessibilityRole="switch"
            accessibilityState={{ checked: wicOnly }}
          >
            <Text style={[styles.toggleFilterText, wicOnly && styles.toggleFilterTextActive]}>
              {wicOnly ? '\u2713 ' : ''}{t('storeFinder.wicOnly')}
            </Text>
          </TouchableOpacity>

          {/* Chain Filter */}
          {chains.length > 0 && (
            <>
              <Text style={[styles.filterTitle, { marginTop: 12 }]}>{t('storeFinder.filterByChain')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chainScroll}>
                <TouchableOpacity
                  style={[styles.chainChip, !selectedChain && styles.chainChipActive]}
                  onPress={() => setSelectedChain(null)}
                >
                  <Text style={[styles.chainChipText, !selectedChain && styles.chainChipTextActive]}>
                    {t('storeFinder.allChains')}
                  </Text>
                </TouchableOpacity>
                {chains.slice(0, 8).map(c => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.chainChip, selectedChain === c.id && styles.chainChipActive]}
                    onPress={() => setSelectedChain(selectedChain === c.id ? null : c.id)}
                  >
                    <Text style={[styles.chainChipText, selectedChain === c.id && styles.chainChipTextActive]}>
                      {c.displayName}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}

          <TouchableOpacity style={styles.searchButton} onPress={handleSearch} accessibilityRole="button">
            <Text style={styles.searchButtonText}>{t('storeFinder.search')}</Text>
          </TouchableOpacity>
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
            <ActivityIndicator size="large" color={colors.navy} />
            <Text style={styles.loadingText}>{t('storeFinder.searching')}</Text>
          </View>
        )}

        {/* Map View */}
        {viewMode === 'map' && !loading && location && stores.length > 0 && (
          <View style={styles.mapContainer}>
            <Text style={styles.mapPlaceholder}>{t('storeFinder.mapNote')}</Text>
          </View>
        )}

        {/* Results */}
        {!loading && stores.length === 0 && location && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon} accessible={false}>🗺️</Text>
            <Text style={styles.emptyTitle}>{t('storeFinder.noResults')}</Text>
            <Text style={styles.emptyText}>{t('storeFinder.noResultsMessage')}</Text>
          </View>
        )}

        {!loading && stores.length > 0 && (viewMode === 'list' || viewMode === 'map') && (
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsHeader} accessibilityRole="header">
              {t('storeFinder.foundCount', { count: stores.length })}
            </Text>
            {stores.map((store, idx) => (
              <TouchableOpacity
                key={`${store.name}-${idx}`}
                style={styles.storeCard}
                onPress={() => handleStorePress(store)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`${store.name}, ${store.distanceMiles} ${t('units.mi')}`}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleRow}>
                    <Text style={styles.storeName}>{store.name}</Text>
                    {store.wicAuthorized && (
                      <View style={styles.wicBadge}>
                        <Text style={styles.wicBadgeText}>WIC</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.distance}>{store.distanceMiles} {t('units.mi')}</Text>
                </View>
                <Text style={styles.address}>
                  {store.address.street}, {store.address.city}, {store.address.state}
                </Text>
                <View style={styles.actionsRow}>
                  {store.phone && (
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => handleCall(store.phone!)}
                      accessibilityRole="button"
                      accessibilityLabel={t('a11y.storeFinder.callLabel')}
                    >
                      <Text style={styles.actionBtnText}>📞 {t('storeFinder.call')}</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.actionBtnPrimary}
                    onPress={() => handleDirections(store)}
                    accessibilityRole="button"
                    accessibilityLabel={t('a11y.storeFinder.directionsLabel')}
                  >
                    <Text style={styles.actionBtnPrimaryText}>🗺️ {t('storeFinder.directions')}</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.screenBg,
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: colors.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    padding: 8,
    gap: 8,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: colors.screenBg,
  },
  toggleBtnActive: {
    backgroundColor: colors.navy,
  },
  toggleBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.muted,
  },
  toggleBtnTextActive: {
    color: colors.white,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  filtersCard: {
    ...card,
    marginBottom: 16,
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.muted,
    marginBottom: 8,
  },
  radiusRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  radiusBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
  },
  radiusBtnActive: {
    borderColor: colors.navy,
    backgroundColor: colors.screenBg,
  },
  radiusBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.muted,
  },
  radiusBtnTextActive: {
    color: colors.navy,
  },
  toggleFilter: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    marginBottom: 12,
  },
  toggleFilterActive: {
    borderColor: colors.navy,
    backgroundColor: colors.screenBg,
  },
  toggleFilterText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.muted,
  },
  toggleFilterTextActive: {
    color: colors.navy,
  },
  chainScroll: {
    marginBottom: 16,
  },
  chainChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.screenBg,
    marginRight: 8,
  },
  chainChipActive: {
    backgroundColor: colors.navy,
  },
  chainChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.muted,
  },
  chainChipTextActive: {
    color: colors.white,
  },
  searchButton: {
    backgroundColor: colors.navy,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  searchButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  centerContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.muted,
  },
  mapContainer: {
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    marginBottom: 16,
  },
  mapPlaceholder: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
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
  resultsContainer: {
    marginBottom: 16,
  },
  resultsHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.navy,
    marginBottom: 12,
  },
  storeCard: {
    ...card,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  storeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.navy,
    flex: 1,
    marginRight: 8,
  },
  wicBadge: {
    backgroundColor: colors.success,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  wicBadgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: 'bold',
  },
  distance: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.navy,
  },
  address: {
    fontSize: 13,
    color: colors.muted,
    marginBottom: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: colors.screenBg,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.navy,
  },
  actionBtnPrimary: {
    flex: 1,
    backgroundColor: colors.navy,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionBtnPrimaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
});
