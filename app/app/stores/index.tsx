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
import { searchStores, getChains } from '@/lib/services/storeFinderService';
import type { Store } from '@/lib/types';
import LocationPrompt from '@/components/LocationPrompt';

export default function StoreFinderScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { location, loading: locationLoading, error: locationError, refresh: refreshLocation, setZipCode } = useLocation();

  const [stores, setStores] = useState<Store[]>([]);
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

  const handleDirections = (store: Store) => {
    const address = `${store.address.street}, ${store.address.city}, ${store.address.state} ${store.address.zip}`;
    const url = Platform.select({
      ios: `maps://app?daddr=${encodeURIComponent(address)}`,
      android: `geo:${store.location.latitude},${store.location.longitude}?q=${encodeURIComponent(address)}`,
    });
    if (url) Linking.openURL(url);
  };

  const handleStorePress = (store: Store) => {
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
            <ActivityIndicator size="large" color="#546E7A" />
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
    backgroundColor: '#f5f5f5',
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    padding: 8,
    gap: 8,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  toggleBtnActive: {
    backgroundColor: '#546E7A',
  },
  toggleBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  toggleBtnTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  filtersCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
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
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  radiusBtnActive: {
    borderColor: '#546E7A',
    backgroundColor: '#ECEFF1',
  },
  radiusBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  radiusBtnTextActive: {
    color: '#546E7A',
  },
  toggleFilter: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    marginBottom: 12,
  },
  toggleFilterActive: {
    borderColor: '#546E7A',
    backgroundColor: '#ECEFF1',
  },
  toggleFilterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  toggleFilterTextActive: {
    color: '#546E7A',
  },
  chainScroll: {
    marginBottom: 16,
  },
  chainChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  chainChipActive: {
    backgroundColor: '#546E7A',
  },
  chainChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
  },
  chainChipTextActive: {
    color: '#fff',
  },
  searchButton: {
    backgroundColor: '#546E7A',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  searchButtonText: {
    color: '#fff',
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
    color: '#666',
  },
  mapContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    marginBottom: 16,
  },
  mapPlaceholder: {
    fontSize: 14,
    color: '#666',
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
    color: '#333',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  resultsContainer: {
    marginBottom: 16,
  },
  resultsHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  storeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
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
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  wicBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  wicBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  distance: {
    fontSize: 13,
    fontWeight: '600',
    color: '#546E7A',
  },
  address: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  actionBtnPrimary: {
    flex: 1,
    backgroundColor: '#546E7A',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionBtnPrimaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
});
