/**
 * Enhanced Store Selector Component
 * Store selection with favorites, recent stores, and default store management
 * Includes all Task H5 features
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Store } from '../types/store.types';
import { useStoreDetection } from '../hooks/useStoreDetection';
import { StoreConfirmationModal } from './StoreConfirmationModal';
import { NearbyStoresList } from './NearbyStoresList';
import { EnhancedStoreSearchModal } from './EnhancedStoreSearchModal';
import * as StoreStorage from '../utils/storeStorage';

interface EnhancedStoreSelectorProps {
  onStoreSelected?: (store: Store) => void;
  autoDetect?: boolean;
  showDefaultOption?: boolean;
}

export const EnhancedStoreSelector: React.FC<EnhancedStoreSelectorProps> = ({
  onStoreSelected,
  autoDetect = true,
  showDefaultOption = true,
}) => {
  const {
    currentStore,
    nearbyStores,
    favoriteStores,
    recentStores,
    confidence,
    isDetecting,
    error,
    permissionStatus,
    requiresConfirmation,
    detectStore,
    confirmStore,
    selectStore,
    requestPermissions,
    toggleFavorite,
    isFavorite,
    setAsDefault,
  } = useStoreDetection();

  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [defaultStoreId, setDefaultStoreId] = useState<string | null>(null);

  /**
   * Load default store ID on mount
   */
  useEffect(() => {
    loadDefaultStore();
  }, []);

  /**
   * Auto-detect store on mount if enabled
   */
  useEffect(() => {
    if (autoDetect && permissionStatus?.granted) {
      detectStore();
    }
  }, [autoDetect, permissionStatus?.granted, detectStore]);

  /**
   * Show confirmation modal when detection requires confirmation
   */
  useEffect(() => {
    if (requiresConfirmation && currentStore) {
      setShowConfirmation(true);
    }
  }, [requiresConfirmation, currentStore]);

  /**
   * Load default store from storage
   */
  const loadDefaultStore = async () => {
    const defaultId = await StoreStorage.getDefaultStore();
    setDefaultStoreId(defaultId);
  };

  /**
   * Handle store confirmation
   */
  const handleConfirm = () => {
    if (currentStore) {
      confirmStore(currentStore.id);
      setShowConfirmation(false);
      onStoreSelected?.(currentStore);
    }
  };

  /**
   * Handle store selection from list
   */
  const handleStoreSelect = (store: Store) => {
    selectStore(store);
    setShowConfirmation(false);
    onStoreSelected?.(store);
  };

  /**
   * Handle permission request
   */
  const handleRequestPermissions = async () => {
    await requestPermissions();
  };

  /**
   * Handle detect store button
   */
  const handleDetectStore = () => {
    detectStore();
  };

  /**
   * Handle change store from confirmation modal
   */
  const handleChangeStore = () => {
    setShowConfirmation(false);
    setShowSearch(true);
  };

  /**
   * Handle dismiss confirmation
   */
  const handleDismissConfirmation = () => {
    setShowConfirmation(false);
  };

  /**
   * Handle set as default
   */
  const handleSetDefault = async (storeId: string) => {
    await setAsDefault(storeId);
    await loadDefaultStore();
  };

  /**
   * Handle clear default
   */
  const handleClearDefault = async () => {
    await StoreStorage.clearDefaultStore();
    setDefaultStoreId(null);
  };

  return (
    <View style={styles.container}>
      {/* Permission Request */}
      {permissionStatus && !permissionStatus.granted && (
        <View style={styles.permissionCard}>
          <Text style={styles.permissionTitle}>Location Permission Needed</Text>
          <Text style={styles.permissionMessage}>
            We need your location to detect which store you're shopping at and
            show you store-specific inventory.
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={handleRequestPermissions}
          >
            <Text style={styles.permissionButtonText}>Allow Location</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Detecting State */}
      {isDetecting && (
        <View style={styles.detectingCard}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.detectingText}>Detecting your store...</Text>
        </View>
      )}

      {/* Error State */}
      {error && (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Detection Failed</Text>
          <Text style={styles.errorMessage}>{error.message}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleDetectStore}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Current Store (if confirmed and no error) */}
      {currentStore && !requiresConfirmation && !error && (
        <View style={styles.currentStoreCard}>
          <View style={styles.currentStoreHeader}>
            <Text style={styles.sectionLabel}>Current Store</Text>
            {defaultStoreId === currentStore.id && (
              <View style={styles.defaultBadge}>
                <Text style={styles.defaultBadgeText}>Default</Text>
              </View>
            )}
          </View>
          <View style={styles.storeCard}>
            <View style={styles.storeInfo}>
              <Text style={styles.storeName}>{currentStore.name}</Text>
              {currentStore.chain && (
                <Text style={styles.storeChain}>{currentStore.chain}</Text>
              )}
              <Text style={styles.storeAddress}>
                {currentStore.address.street}, {currentStore.address.city}
              </Text>
              {confidence > 0 && confidence < 100 && (
                <Text style={styles.confidenceText}>{confidence}% match</Text>
              )}
            </View>
            <View style={styles.storeActions}>
              <TouchableOpacity
                style={styles.changeButton}
                onPress={() => setShowSearch(true)}
              >
                <Text style={styles.changeButtonText}>Change</Text>
              </TouchableOpacity>
              {showDefaultOption && (
                <TouchableOpacity
                  style={styles.defaultButton}
                  onPress={() =>
                    defaultStoreId === currentStore.id
                      ? handleClearDefault()
                      : handleSetDefault(currentStore.id)
                  }
                >
                  <Text style={styles.defaultButtonText}>
                    {defaultStoreId === currentStore.id ? 'Clear Default' : 'Set Default'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      )}

      {/* Favorites Section */}
      {favoriteStores.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Favorite Stores</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {favoriteStores.map((store) => (
              <TouchableOpacity
                key={store.id}
                style={styles.favoriteCard}
                onPress={() => handleStoreSelect(store)}
              >
                <View style={styles.favoriteCardContent}>
                  <Text style={styles.favoriteStoreName} numberOfLines={2}>
                    {store.name}
                  </Text>
                  {defaultStoreId === store.id && (
                    <View style={styles.miniDefaultBadge}>
                      <Text style={styles.miniDefaultText}>★ Default</Text>
                    </View>
                  )}
                  <Text style={styles.favoriteStoreCity}>{store.address.city}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Recent Stores Section */}
      {recentStores.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Recent Stores</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {recentStores.map((store) => (
              <TouchableOpacity
                key={store.id}
                style={styles.recentCard}
                onPress={() => handleStoreSelect(store)}
              >
                <Text style={styles.recentStoreName} numberOfLines={2}>
                  {store.name}
                </Text>
                {defaultStoreId === store.id && (
                  <View style={styles.miniDefaultBadge}>
                    <Text style={styles.miniDefaultText}>★ Default</Text>
                  </View>
                )}
                <Text style={styles.recentStoreCity}>{store.address.city}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Nearby Stores Section */}
      {nearbyStores.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Nearby Stores</Text>
          <NearbyStoresList
            stores={nearbyStores}
            onStoreSelect={handleStoreSelect}
            currentStoreId={currentStore?.id}
            isFavorite={isFavorite}
            onToggleFavorite={toggleFavorite}
          />
        </View>
      )}

      {/* Manual Actions */}
      <View style={styles.actions}>
        {permissionStatus?.granted && (
          <TouchableOpacity
            style={styles.detectButton}
            onPress={handleDetectStore}
            disabled={isDetecting}
          >
            <Text style={styles.detectButtonText}>
              {isDetecting ? 'Detecting...' : 'Detect My Store'}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.searchButton}
          onPress={() => setShowSearch(true)}
        >
          <Text style={styles.searchButtonText}>Search for Store</Text>
        </TouchableOpacity>
      </View>

      {/* Confirmation Modal */}
      <StoreConfirmationModal
        visible={showConfirmation}
        store={currentStore}
        confidence={confidence}
        onConfirm={handleConfirm}
        onChangeStore={handleChangeStore}
        onDismiss={handleDismissConfirmation}
      />

      {/* Search Modal */}
      <EnhancedStoreSearchModal
        visible={showSearch}
        onStoreSelect={(store) => {
          handleStoreSelect(store);
          setShowSearch(false);
        }}
        onClose={() => setShowSearch(false)}
        isFavorite={isFavorite}
        onToggleFavorite={toggleFavorite}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  permissionCard: {
    backgroundColor: '#FFF',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  permissionMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  permissionButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  permissionButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  detectingCard: {
    backgroundColor: '#FFF',
    margin: 16,
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detectingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  errorCard: {
    backgroundColor: '#FFF',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F44336',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: '#F44336',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  currentStoreCard: {
    backgroundColor: '#FFF',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  currentStoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  defaultBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  defaultBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
  },
  storeCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  storeInfo: {
    flex: 1,
  },
  storeName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  storeChain: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  storeAddress: {
    fontSize: 13,
    color: '#999',
    marginBottom: 4,
  },
  confidenceText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },
  storeActions: {
    gap: 8,
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
  defaultButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: '#F5F5F5',
  },
  defaultButtonText: {
    color: '#666',
    fontSize: 13,
    fontWeight: '600',
  },
  section: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  favoriteCard: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginRight: 12,
    width: 160,
    borderWidth: 2,
    borderColor: '#FFD700',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  favoriteCardContent: {
    minHeight: 80,
  },
  favoriteStoreName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  miniDefaultBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  miniDefaultText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
  },
  favoriteStoreCity: {
    fontSize: 13,
    color: '#666',
  },
  recentCard: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginRight: 12,
    width: 150,
    minHeight: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recentStoreName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  recentStoreCity: {
    fontSize: 13,
    color: '#666',
  },
  actions: {
    padding: 16,
    gap: 12,
  },
  detectButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  detectButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  searchButton: {
    backgroundColor: '#FFF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#0066CC',
  },
  searchButtonText: {
    color: '#0066CC',
    fontSize: 16,
    fontWeight: '600',
  },
});
