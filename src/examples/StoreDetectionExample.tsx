/**
 * Store Detection Example
 * Complete example showing how to use the geofence-based store detection system
 */

import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet, ScrollView, Alert } from 'react-native';
import { useStoreDetection } from '../hooks/useStoreDetection';
import { Store } from '../types/store.types';

/**
 * Example component showing store detection UI
 */
export function StoreDetectionExample() {
  const {
    currentStore,
    nearbyStores,
    confidence,
    isDetecting,
    error,
    permissionStatus,
    requiresConfirmation,
    detectStore,
    confirmStore,
    selectStore,
    requestPermissions,
    searchStores,
    startContinuousDetection,
    stopContinuousDetection,
  } = useStoreDetection();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Store[]>([]);
  const [continuousMode, setContinuousMode] = useState(false);

  // Auto-detect on mount if permissions granted
  useEffect(() => {
    if (permissionStatus?.granted) {
      detectStore();
    }
  }, [permissionStatus]);

  // Handle continuous detection toggle
  useEffect(() => {
    if (continuousMode && permissionStatus?.granted) {
      startContinuousDetection();
    } else {
      stopContinuousDetection();
    }

    return () => {
      stopContinuousDetection();
    };
  }, [continuousMode, permissionStatus]);

  const handleRequestPermissions = async () => {
    await requestPermissions();
  };

  const handleDetectStore = async () => {
    await detectStore();
  };

  const handleConfirmStore = () => {
    if (currentStore) {
      confirmStore(currentStore.id);
      Alert.alert('Store Confirmed', `Shopping at ${currentStore.name}`);
    }
  };

  const handleSelectStore = (store: Store) => {
    selectStore(store);
    setSearchResults([]);
    setSearchQuery('');
  };

  const handleSearch = async () => {
    if (searchQuery.trim()) {
      const results = await searchStores(searchQuery);
      setSearchResults(results);
    }
  };

  const toggleContinuousMode = () => {
    setContinuousMode(!continuousMode);
  };

  // Permission request screen
  if (!permissionStatus?.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Location Access Required</Text>
        <Text style={styles.description}>
          WIC Benefits Assistant needs your location to automatically detect which
          store you're shopping at and provide store-specific information.
        </Text>
        <Button
          title="Enable Location Access"
          onPress={handleRequestPermissions}
        />
        {permissionStatus?.blocked && (
          <Text style={styles.warningText}>
            Location access is blocked. Please enable it in your device settings.
          </Text>
        )}
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error: {error.message}</Text>
        <Button title="Try Again" onPress={handleDetectStore} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Store Detection</Text>

      {/* Detection Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Detection Status</Text>
        {isDetecting ? (
          <Text style={styles.statusText}>Detecting store...</Text>
        ) : currentStore ? (
          <View>
            <Text style={styles.storeName}>{currentStore.name}</Text>
            <Text style={styles.storeAddress}>
              {currentStore.address.street}, {currentStore.address.city}
            </Text>
            <View style={styles.confidenceContainer}>
              <Text style={styles.confidenceLabel}>Confidence:</Text>
              <View
                style={[
                  styles.confidenceBadge,
                  confidence >= 95
                    ? styles.highConfidence
                    : confidence >= 70
                    ? styles.mediumConfidence
                    : styles.lowConfidence,
                ]}
              >
                <Text style={styles.confidenceText}>{confidence}%</Text>
              </View>
            </View>
            {requiresConfirmation && (
              <View style={styles.confirmationContainer}>
                <Text style={styles.confirmationText}>
                  Is this the correct store?
                </Text>
                <Button title="Confirm" onPress={handleConfirmStore} />
              </View>
            )}
          </View>
        ) : (
          <Text style={styles.statusText}>No store detected</Text>
        )}
      </View>

      {/* Detection Controls */}
      <View style={styles.section}>
        <Button
          title={isDetecting ? 'Detecting...' : 'Detect Store'}
          onPress={handleDetectStore}
          disabled={isDetecting}
        />
        <View style={styles.toggleContainer}>
          <Text>Continuous Detection:</Text>
          <Button
            title={continuousMode ? 'ON' : 'OFF'}
            onPress={toggleContinuousMode}
          />
        </View>
      </View>

      {/* Nearby Stores */}
      {nearbyStores.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nearby Stores</Text>
          {nearbyStores.map((store) => (
            <View key={store.id} style={styles.storeCard}>
              <Text style={styles.storeName}>{store.name}</Text>
              <Text style={styles.storeAddress}>
                {store.address.street}, {store.address.city}
              </Text>
              <Button
                title="Select This Store"
                onPress={() => handleSelectStore(store)}
              />
            </View>
          ))}
        </View>
      )}

      {/* Manual Search */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Search for Store</Text>
        <View style={styles.searchContainer}>
          <Text>Search: (Example only - needs TextInput component)</Text>
          <Button title="Search" onPress={handleSearch} />
        </View>
        {searchResults.map((store) => (
          <View key={store.id} style={styles.storeCard}>
            <Text style={styles.storeName}>{store.name}</Text>
            <Text style={styles.storeAddress}>
              {store.address.street}, {store.address.city}
            </Text>
            <Button
              title="Select This Store"
              onPress={() => handleSelectStore(store)}
            />
          </View>
        ))}
      </View>

      {/* Debug Info */}
      {__DEV__ && currentStore && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Debug Info</Text>
          <Text style={styles.debugText}>Store ID: {currentStore.id}</Text>
          <Text style={styles.debugText}>
            Has Geofence: {currentStore.geofence ? 'Yes' : 'No'}
          </Text>
          {currentStore.geofence && (
            <Text style={styles.debugText}>
              Geofence Type: {currentStore.geofence.type}
            </Text>
          )}
          <Text style={styles.debugText}>Confidence: {confidence}%</Text>
          <Text style={styles.debugText}>
            Needs Confirmation: {requiresConfirmation ? 'Yes' : 'No'}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    marginBottom: 16,
    lineHeight: 24,
  },
  section: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  statusText: {
    fontSize: 16,
    color: '#666',
  },
  storeName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  storeAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  confidenceLabel: {
    fontSize: 14,
    marginRight: 8,
  },
  confidenceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  highConfidence: {
    backgroundColor: '#4CAF50',
  },
  mediumConfidence: {
    backgroundColor: '#FFC107',
  },
  lowConfidence: {
    backgroundColor: '#F44336',
  },
  confidenceText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  confirmationContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
  },
  confirmationText: {
    fontSize: 16,
    marginBottom: 8,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  storeCard: {
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  searchContainer: {
    marginBottom: 12,
  },
  errorText: {
    fontSize: 16,
    color: '#F44336',
    marginBottom: 16,
  },
  warningText: {
    fontSize: 14,
    color: '#F44336',
    marginTop: 16,
    textAlign: 'center',
  },
  debugText: {
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 4,
    color: '#666',
  },
});

/**
 * Example of creating mock stores with geofences for testing
 */
export function createMockStoreWithGeofence(): Store {
  return {
    id: 'store-walmart-001',
    name: 'Walmart Supercenter',
    chain: 'Walmart',
    address: {
      street: '123 Main Street',
      city: 'Springfield',
      state: 'IL',
      zip: '62701',
      country: 'US',
    },
    location: {
      lat: 39.7817,
      lng: -89.6501,
    },
    geofence: {
      type: 'circle',
      center: {
        lat: 39.7817,
        lng: -89.6501,
      },
      radiusMeters: 100,
    },
    wicAuthorized: true,
    wicVendorId: 'WIC-IL-001',
    phone: '(217) 555-0100',
    hours: [
      { dayOfWeek: 0, openTime: '08:00', closeTime: '20:00' },
      { dayOfWeek: 1, openTime: '06:00', closeTime: '23:00' },
      { dayOfWeek: 2, openTime: '06:00', closeTime: '23:00' },
      { dayOfWeek: 3, openTime: '06:00', closeTime: '23:00' },
      { dayOfWeek: 4, openTime: '06:00', closeTime: '23:00' },
      { dayOfWeek: 5, openTime: '06:00', closeTime: '23:00' },
      { dayOfWeek: 6, openTime: '06:00', closeTime: '23:00' },
    ],
    timezone: 'America/Chicago',
    features: {
      hasPharmacy: true,
      acceptsEbt: true,
      acceptsWic: true,
      hasWicKiosk: true,
    },
    inventoryApiAvailable: true,
    inventoryApiType: 'walmart',
    lastVerified: new Date(),
    dataSource: 'api',
    active: true,
  };
}

/**
 * Example of creating a store with polygon geofence
 */
export function createMockStoreWithPolygonGeofence(): Store {
  return {
    id: 'store-kroger-001',
    name: 'Kroger',
    chain: 'Kroger',
    address: {
      street: '456 Oak Avenue',
      city: 'Springfield',
      state: 'IL',
      zip: '62702',
      country: 'US',
    },
    location: {
      lat: 39.7850,
      lng: -89.6550,
    },
    geofence: {
      type: 'polygon',
      coordinates: [
        { lat: 39.7848, lng: -89.6553 },
        { lat: 39.7852, lng: -89.6553 },
        { lat: 39.7852, lng: -89.6547 },
        { lat: 39.7848, lng: -89.6547 },
      ],
    },
    wicAuthorized: true,
    wicVendorId: 'WIC-IL-002',
    hours: [],
    timezone: 'America/Chicago',
    features: {
      acceptsWic: true,
    },
    inventoryApiAvailable: true,
    inventoryApiType: 'kroger',
    lastVerified: new Date(),
    dataSource: 'api',
    active: true,
  };
}

export default StoreDetectionExample;
