/**
 * Manual Store Selection Screen
 * Comprehensive screen for manual store selection with search and favorites
 * Implements full Task H5 requirements
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Store, GeoPoint } from '../types/store.types';
import { useStore } from '../contexts/StoreContext';
import LocationService from '../services/LocationService';
import { EnhancedStoreSearchModal } from '../components/EnhancedStoreSearchModal';
import { NearbyStoresList } from '../components/NearbyStoresList';
import * as StoreStorage from '../utils/storeStorage';

interface ManualStoreSelectionScreenProps {
  onStoreSelected?: (store: Store) => void;
  onBack?: () => void;
}

export const ManualStoreSelectionScreen: React.FC<ManualStoreSelectionScreenProps> = ({
  onStoreSelected,
  onBack,
}) => {
  const {
    currentStore,
    favoriteStores,
    recentStores,
    nearbyStores,
    permissionStatus,
    isDetecting,
    detectStore,
    selectStore,
    toggleFavorite,
    isFavorite,
    setAsDefault,
  } = useStore();

  const [showSearch, setShowSearch] = useState(false);
  const [userLocation, setUserLocation] = useState<GeoPoint | null>(null);
  const [defaultStoreId, setDefaultStoreId] = useState<string | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  const locationService = LocationService.getInstance();

  /**
   * Load default store ID and user location on mount
   */
  useEffect(() => {
    loadDefaultStore();
    loadUserLocation();
  }, []);

  /**
   * Load default store from storage
   */
  const loadDefaultStore = async () => {
    const defaultId = await StoreStorage.getDefaultStore();
    setDefaultStoreId(defaultId);
  };

  /**
   * Load user's current location
   */
  const loadUserLocation = async () => {
    if (permissionStatus?.granted) {
      setIsLoadingLocation(true);
      try {
        const location = await locationService.getCurrentLocation();
        setUserLocation(location);
      } catch (error) {
        console.error('Failed to get location:', error);
      } finally {
        setIsLoadingLocation(false);
      }
    }
  };

  /**
   * Handle store selection
   */
  const handleStoreSelect = async (store: Store) => {
    selectStore(store);
    onStoreSelected?.(store);
  };

  /**
   * Handle set as default
   */
  const handleSetDefault = async (storeId: string) => {
    await setAsDefault(storeId);
    setDefaultStoreId(storeId);
  };

  /**
   * Handle clear default
   */
  const handleClearDefault = async () => {
    await StoreStorage.clearDefaultStore();
    setDefaultStoreId(null);
  };

  /**
   * Handle toggle favorite with UI update
   */
  const handleToggleFavorite = async (store: Store) => {
    const result = await toggleFavorite(store);
    return result;
  };

  /**
   * Render favorite stores section
   */
  const renderFavorites = () => {
    if (favoriteStores.length === 0) {
      return null;
    }

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Favorite Stores</Text>
        <Text style={styles.sectionSubtitle}>
          Quickly access your most frequented stores
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
        >
          {favoriteStores.map((store) => (
            <TouchableOpacity
              key={store.id}
              style={[
                styles.favoriteCard,
                currentStore?.id === store.id && styles.currentCard,
              ]}
              onPress={() => handleStoreSelect(store)}
            >
              <View style={styles.favoriteHeader}>
                <Text style={styles.favoriteStoreName} numberOfLines={2}>
                  {store.name}
                </Text>
                {defaultStoreId === store.id && (
                  <View style={styles.defaultBadge}>
                    <Text style={styles.defaultBadgeText}>Default</Text>
                  </View>
                )}
              </View>
              <Text style={styles.favoriteStoreCity} numberOfLines={1}>
                {store.address.city}, {store.address.state}
              </Text>
              {currentStore?.id !== store.id && (
                <TouchableOpacity
                  style={styles.setDefaultButton}
                  onPress={() => handleSetDefault(store.id)}
                >
                  <Text style={styles.setDefaultButtonText}>
                    {defaultStoreId === store.id ? 'Clear Default' : 'Set Default'}
                  </Text>
                </TouchableOpacity>
              )}
              {currentStore?.id === store.id && (
                <View style={styles.currentIndicator}>
                  <Text style={styles.currentText}>Current</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  /**
   * Render recent stores section
   */
  const renderRecent = () => {
    if (recentStores.length === 0) {
      return null;
    }

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Stores</Text>
        <Text style={styles.sectionSubtitle}>
          Stores you've recently shopped at
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
        >
          {recentStores.map((store) => (
            <TouchableOpacity
              key={store.id}
              style={[
                styles.recentCard,
                currentStore?.id === store.id && styles.currentCard,
              ]}
              onPress={() => handleStoreSelect(store)}
            >
              <View style={styles.recentHeader}>
                <Text style={styles.recentStoreName} numberOfLines={2}>
                  {store.name}
                </Text>
                <TouchableOpacity
                  style={styles.miniStarButton}
                  onPress={() => handleToggleFavorite(store)}
                >
                  <Text style={styles.miniStar}>
                    {isFavorite(store.id) ? '★' : '☆'}
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.recentStoreCity} numberOfLines={1}>
                {store.address.city}, {store.address.state}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  /**
   * Render nearby stores section
   */
  const renderNearby = () => {
    if (!permissionStatus?.granted) {
      return null;
    }

    if (nearbyStores.length === 0 && !isDetecting) {
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nearby Stores</Text>
          <View style={styles.emptyNearby}>
            <Text style={styles.emptyText}>
              No nearby stores detected
            </Text>
            <TouchableOpacity
              style={styles.detectButton}
              onPress={detectStore}
            >
              <Text style={styles.detectButtonText}>Detect Stores</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (nearbyStores.length > 0) {
      return (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <Text style={styles.sectionTitle}>Nearby Stores</Text>
              <Text style={styles.sectionSubtitle}>
                {nearbyStores.length} store{nearbyStores.length !== 1 ? 's' : ''} found
              </Text>
            </View>
            {!isDetecting && (
              <TouchableOpacity
                style={styles.refreshButton}
                onPress={detectStore}
              >
                <Text style={styles.refreshButtonText}>Refresh</Text>
              </TouchableOpacity>
            )}
          </View>
          <NearbyStoresList
            stores={nearbyStores}
            onStoreSelect={handleStoreSelect}
            currentStoreId={currentStore?.id}
            userLocation={userLocation || undefined}
            isFavorite={isFavorite}
            onToggleFavorite={handleToggleFavorite}
          />
        </View>
      );
    }

    return null;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>Select Store</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Current Store Display */}
      {currentStore && (
        <View style={styles.currentStoreSection}>
          <Text style={styles.currentLabel}>Current Store</Text>
          <View style={styles.currentStoreCard}>
            <View style={styles.currentStoreInfo}>
              <Text style={styles.currentStoreName}>{currentStore.name}</Text>
              <Text style={styles.currentStoreAddress}>
                {currentStore.address.street}, {currentStore.address.city}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.changeButton}
              onPress={() => setShowSearch(true)}
            >
              <Text style={styles.changeButtonText}>Change</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Search Button */}
        <TouchableOpacity
          style={styles.searchCard}
          onPress={() => setShowSearch(true)}
        >
          <View style={styles.searchCardContent}>
            <Text style={styles.searchIcon}>🔍</Text>
            <View style={styles.searchCardText}>
              <Text style={styles.searchCardTitle}>Search for a Store</Text>
              <Text style={styles.searchCardSubtitle}>
                By name, address, city, or ZIP code
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Favorites Section */}
        {renderFavorites()}

        {/* Recent Stores Section */}
        {renderRecent()}

        {/* Nearby Stores Section */}
        {renderNearby()}

        {/* Detecting State */}
        {isDetecting && (
          <View style={styles.detectingContainer}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.detectingText}>Finding nearby stores...</Text>
          </View>
        )}

        {/* No Permission Prompt */}
        {!permissionStatus?.granted && (
          <View style={styles.permissionPrompt}>
            <Text style={styles.permissionTitle}>
              Enable Location for Better Experience
            </Text>
            <Text style={styles.permissionMessage}>
              Allow location access to automatically detect stores and see nearby options.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Search Modal */}
      <EnhancedStoreSearchModal
        visible={showSearch}
        onStoreSelect={(store) => {
          handleStoreSelect(store);
          setShowSearch(false);
        }}
        onClose={() => setShowSearch(false)}
        isFavorite={isFavorite}
        onToggleFavorite={handleToggleFavorite}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#0066CC',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  headerSpacer: {
    width: 60,
  },
  currentStoreSection: {
    backgroundColor: '#FFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  currentLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  currentStoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  currentStoreInfo: {
    flex: 1,
  },
  currentStoreName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  currentStoreAddress: {
    fontSize: 13,
    color: '#666',
  },
  changeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#0066CC',
  },
  changeButtonText: {
    color: '#0066CC',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 32,
  },
  searchCard: {
    backgroundColor: '#FFF',
    margin: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4CAF50',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  searchIcon: {
    fontSize: 32,
  },
  searchCardText: {
    flex: 1,
  },
  searchCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  searchCardSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  sectionHeaderLeft: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#666',
  },
  refreshButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#E8F5E9',
  },
  refreshButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4CAF50',
  },
  horizontalList: {
    paddingVertical: 12,
    gap: 12,
  },
  favoriteCard: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    width: 200,
    borderWidth: 2,
    borderColor: '#FFD700',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  currentCard: {
    borderColor: '#4CAF50',
    backgroundColor: '#F1F8F4',
  },
  favoriteHeader: {
    marginBottom: 8,
    minHeight: 44,
  },
  favoriteStoreName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  favoriteStoreCity: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
  },
  defaultBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  defaultBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
  },
  setDefaultButton: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  setDefaultButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  currentIndicator: {
    backgroundColor: '#4CAF50',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  currentText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFF',
  },
  recentCard: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    width: 180,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    minHeight: 44,
  },
  recentStoreName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  miniStarButton: {
    padding: 2,
    marginLeft: 8,
  },
  miniStar: {
    fontSize: 20,
    color: '#FFD700',
  },
  recentStoreCity: {
    fontSize: 13,
    color: '#666',
  },
  emptyNearby: {
    backgroundColor: '#FFF',
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  detectButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  detectButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  detectingContainer: {
    padding: 32,
    alignItems: 'center',
  },
  detectingText: {
    fontSize: 15,
    color: '#666',
    marginTop: 12,
  },
  permissionPrompt: {
    backgroundColor: '#FFF',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  permissionMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});
