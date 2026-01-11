/**
 * Enhanced Store Search Modal Component
 * Modal for searching and selecting stores manually with location-based search
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Store, GeoPoint } from '../types/store.types';
import LocationService from '../services/LocationService';
import StoreApiService from '../services/StoreApiService';
import { sortStoresByDistance, formatDistance } from '../utils/distance.utils';

interface EnhancedStoreSearchModalProps {
  visible: boolean;
  onStoreSelect: (store: Store) => void;
  onClose: () => void;
  isFavorite: (storeId: string) => boolean;
  onToggleFavorite: (store: Store) => Promise<boolean>;
}

type SearchMode = 'text' | 'nearby';

interface StoreWithDistance extends Store {
  distance?: number;
}

export const EnhancedStoreSearchModal: React.FC<EnhancedStoreSearchModalProps> = ({
  visible,
  onStoreSelect,
  onClose,
  isFavorite,
  onToggleFavorite,
}) => {
  const [searchMode, setSearchMode] = useState<SearchMode>('text');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StoreWithDistance[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [userLocation, setUserLocation] = useState<GeoPoint | null>(null);

  const storeApiService = StoreApiService.getInstance();
  const locationService = LocationService.getInstance();

  /**
   * Handle text-based search
   */
  const handleTextSearch = useCallback(async () => {
    if (!query.trim()) {
      return;
    }

    setIsSearching(true);
    setHasSearched(true);

    try {
      let searchResults = await storeApiService.searchStores(query);

      // If we have user location, add distance and sort
      if (userLocation) {
        const resultsWithDistance = sortStoresByDistance(searchResults, userLocation);
        setResults(resultsWithDistance);
      } else {
        setResults(searchResults);
      }
    } catch (err) {
      console.error('Search failed:', err);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [query, userLocation]);

  /**
   * Handle nearby location search
   */
  const handleNearbySearch = useCallback(async () => {
    setIsSearching(true);
    setHasSearched(true);

    try {
      // Get current location
      const location = await locationService.getCurrentLocation();
      setUserLocation(location);

      // Search for nearby stores
      const nearbyStores = await storeApiService.getNearbyStores({
        lat: location.lat,
        lng: location.lng,
        radius: 8000, // 5 miles in meters
        limit: 50,
        wicOnly: true,
      });

      // Add distance and sort
      const resultsWithDistance = sortStoresByDistance(nearbyStores, location);
      setResults(resultsWithDistance);
    } catch (err) {
      console.error('Nearby search failed:', err);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  /**
   * Handle search based on mode
   */
  const handleSearch = useCallback(() => {
    if (searchMode === 'text') {
      handleTextSearch();
    } else {
      handleNearbySearch();
    }
  }, [searchMode, handleTextSearch, handleNearbySearch]);

  /**
   * Handle query change
   */
  const handleQueryChange = (text: string) => {
    setQuery(text);
    // Reset searched state if query is cleared
    if (!text.trim()) {
      setHasSearched(false);
      setResults([]);
    }
  };

  /**
   * Handle store selection
   */
  const handleStoreSelect = (store: Store) => {
    onStoreSelect(store);
    // Reset state
    setQuery('');
    setResults([]);
    setHasSearched(false);
    setSearchMode('text');
  };

  /**
   * Handle modal close
   */
  const handleClose = () => {
    // Reset state
    setQuery('');
    setResults([]);
    setHasSearched(false);
    setSearchMode('text');
    setUserLocation(null);
    onClose();
  };

  /**
   * Handle toggle favorite
   */
  const handleToggleFavorite = async (
    store: Store,
    event: any
  ) => {
    event.stopPropagation();
    await onToggleFavorite(store);
  };

  /**
   * Switch to nearby search mode
   */
  const switchToNearby = () => {
    setSearchMode('nearby');
    setQuery('');
    setHasSearched(false);
    setResults([]);
  };

  /**
   * Switch to text search mode
   */
  const switchToText = () => {
    setSearchMode('text');
    setHasSearched(false);
    setResults([]);
  };

  /**
   * Render store item
   */
  const renderStore = ({ item }: { item: StoreWithDistance }) => {
    const isFav = isFavorite(item.id);

    return (
      <TouchableOpacity
        style={styles.storeItem}
        onPress={() => handleStoreSelect(item)}
      >
        <View style={styles.storeContent}>
          <View style={styles.storeHeader}>
            <View style={styles.storeInfo}>
              <View style={styles.storeNameRow}>
                <Text style={styles.storeName}>{item.name}</Text>
                {item.distance !== undefined && (
                  <Text style={styles.distance}>
                    {formatDistance(item.distance)}
                  </Text>
                )}
              </View>
              {item.chain && (
                <Text style={styles.storeChain}>{item.chain}</Text>
              )}
            </View>

            <TouchableOpacity
              style={styles.favoriteButton}
              onPress={(e) => handleToggleFavorite(item, e)}
            >
              <Text style={styles.favoriteIcon}>
                {isFav ? '★' : '☆'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.storeAddress}>
            {item.address.street}, {item.address.city}, {item.address.state}
          </Text>

          <View style={styles.storeBadges}>
            {item.wicAuthorized && (
              <View style={styles.wicBadge}>
                <Text style={styles.wicBadgeText}>✓ WIC</Text>
              </View>
            )}
            {item.features.hasPharmacy && (
              <View style={styles.featureBadge}>
                <Text style={styles.featureBadgeText}>Pharmacy</Text>
              </View>
            )}
            {item.inventoryApiAvailable && (
              <View style={styles.inventoryBadge}>
                <Text style={styles.inventoryBadgeText}>Live Inventory</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Find Store</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Search Mode Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tab,
              searchMode === 'text' && styles.tabActive,
            ]}
            onPress={switchToText}
          >
            <Text
              style={[
                styles.tabText,
                searchMode === 'text' && styles.tabTextActive,
              ]}
            >
              Search
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab,
              searchMode === 'nearby' && styles.tabActive,
            ]}
            onPress={switchToNearby}
          >
            <Text
              style={[
                styles.tabText,
                searchMode === 'nearby' && styles.tabTextActive,
              ]}
            >
              Nearby
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Input (Text Mode) */}
        {searchMode === 'text' && (
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Store name, address, or ZIP code"
              value={query}
              onChangeText={handleQueryChange}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
              autoFocus={true}
            />
            <TouchableOpacity
              style={[
                styles.searchButton,
                !query.trim() && styles.searchButtonDisabled,
              ]}
              onPress={handleSearch}
              disabled={!query.trim() || isSearching}
            >
              {isSearching ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.searchButtonText}>Search</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Nearby Search Button */}
        {searchMode === 'nearby' && (
          <View style={styles.nearbyContainer}>
            <View style={styles.nearbyInfo}>
              <Text style={styles.nearbyIcon}>📍</Text>
              <Text style={styles.nearbyText}>
                Find WIC-authorized stores near your current location
              </Text>
            </View>
            <TouchableOpacity
              style={styles.nearbyButton}
              onPress={handleSearch}
              disabled={isSearching}
            >
              {isSearching ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.nearbyButtonText}>
                  Use Current Location
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Results */}
        <View style={styles.resultsContainer}>
          {isSearching && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4CAF50" />
              <Text style={styles.loadingText}>
                {searchMode === 'nearby' ? 'Finding nearby stores...' : 'Searching...'}
              </Text>
            </View>
          )}

          {!isSearching && hasSearched && results.length === 0 && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No stores found</Text>
              <Text style={styles.emptyMessage}>
                {searchMode === 'nearby'
                  ? 'No WIC-authorized stores found nearby. Try expanding your search area.'
                  : 'Try searching with a different name, address, or ZIP code'}
              </Text>
            </View>
          )}

          {!isSearching && !hasSearched && searchMode === 'text' && (
            <View style={styles.instructionsContainer}>
              <Text style={styles.instructionsTitle}>
                Search for a store
              </Text>
              <Text style={styles.instructionsText}>
                Enter a store name, address, city, or ZIP code to find
                WIC-authorized stores.
              </Text>
              <View style={styles.examplesContainer}>
                <Text style={styles.examplesTitle}>Examples:</Text>
                <Text style={styles.exampleText}>• Walmart</Text>
                <Text style={styles.exampleText}>• 123 Main St</Text>
                <Text style={styles.exampleText}>• Ann Arbor, MI</Text>
                <Text style={styles.exampleText}>• 48104</Text>
              </View>
            </View>
          )}

          {!isSearching && results.length > 0 && (
            <>
              <View style={styles.resultsHeader}>
                <Text style={styles.resultsCount}>
                  {results.length} store{results.length !== 1 ? 's' : ''} found
                </Text>
                {searchMode === 'nearby' && (
                  <Text style={styles.resultsSorted}>Sorted by distance</Text>
                )}
              </View>
              <FlatList
                data={results}
                renderItem={renderStore}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                keyboardShouldPersistTaps="handled"
              />
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#666',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#4CAF50',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  tabTextActive: {
    color: '#4CAF50',
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFF',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  searchInput: {
    flex: 1,
    height: 44,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#333',
  },
  searchButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  searchButtonDisabled: {
    backgroundColor: '#CCC',
  },
  searchButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  nearbyContainer: {
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  nearbyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  nearbyIcon: {
    fontSize: 32,
  },
  nearbyText: {
    flex: 1,
    fontSize: 15,
    color: '#666',
    lineHeight: 20,
  },
  nearbyButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  nearbyButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resultsContainer: {
    flex: 1,
  },
  resultsHeader: {
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  resultsCount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  resultsSorted: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  instructionsContainer: {
    flex: 1,
    padding: 32,
  },
  instructionsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  instructionsText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 24,
  },
  examplesContainer: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  examplesTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  exampleText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  storeItem: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  storeContent: {
    padding: 16,
  },
  storeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  storeInfo: {
    flex: 1,
  },
  storeNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  storeName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    flex: 1,
  },
  distance: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
    marginLeft: 8,
  },
  storeChain: {
    fontSize: 14,
    color: '#666',
  },
  storeAddress: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
  },
  favoriteButton: {
    padding: 4,
    marginLeft: 8,
  },
  favoriteIcon: {
    fontSize: 24,
    color: '#FFD700',
  },
  storeBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  wicBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  wicBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
  },
  featureBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  featureBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2196F3',
  },
  inventoryBadge: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  inventoryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF9800',
  },
});
