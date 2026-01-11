/**
 * Store Selection Screen
 * Example screen demonstrating store confirmation UX
 * Implements complete store detection and selection flow
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Text,
} from 'react-native';
import { useStoreDetection } from '../hooks/useStoreDetection';
import {
  StoreLocationBanner,
  StoreSelector,
  CurrentStoreDisplay,
} from '../components/store';
import { Store } from '../types/store.types';

export const StoreSelectionScreen: React.FC = () => {
  const {
    currentStore,
    permissionStatus,
    detectStore,
  } = useStoreDetection();

  const [showSelector, setShowSelector] = useState(false);

  /**
   * Auto-detect on mount if we have permissions
   */
  useEffect(() => {
    if (permissionStatus?.granted && !currentStore) {
      detectStore();
    }
  }, [permissionStatus?.granted]);

  /**
   * Handle store selection
   */
  const handleStoreSelected = (store: Store) => {
    console.log('Store selected:', store.name);
    setShowSelector(false);
  };

  /**
   * Handle banner press
   */
  const handleBannerPress = () => {
    setShowSelector(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Persistent location banner at top */}
      <StoreLocationBanner
        store={currentStore}
        onPress={handleBannerPress}
        showLocationIcon={true}
      />

      <ScrollView style={styles.content}>
        {/* Store Selection Section */}
        {showSelector ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Your Store</Text>
            <StoreSelector
              onStoreSelected={handleStoreSelected}
              autoDetect={true}
            />
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Current Store</Text>
            <CurrentStoreDisplay
              store={currentStore}
              onPress={handleBannerPress}
              showChangeButton={true}
              compact={false}
            />
          </View>
        )}

        {/* Additional content sections would go here */}
        {currentStore && !showSelector && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Store Features</Text>
            <View style={styles.featuresContainer}>
              {currentStore.wicAuthorized && (
                <View style={styles.featureCard}>
                  <Text style={styles.featureIcon}>✓</Text>
                  <View style={styles.featureInfo}>
                    <Text style={styles.featureTitle}>WIC Authorized</Text>
                    <Text style={styles.featureDescription}>
                      This store accepts WIC benefits
                    </Text>
                  </View>
                </View>
              )}

              {currentStore.inventoryApiAvailable && (
                <View style={styles.featureCard}>
                  <Text style={styles.featureIcon}>📦</Text>
                  <View style={styles.featureInfo}>
                    <Text style={styles.featureTitle}>Live Inventory</Text>
                    <Text style={styles.featureDescription}>
                      Real-time stock information available
                    </Text>
                  </View>
                </View>
              )}

              {currentStore.features.hasPharmacy && (
                <View style={styles.featureCard}>
                  <Text style={styles.featureIcon}>💊</Text>
                  <View style={styles.featureInfo}>
                    <Text style={styles.featureTitle}>Pharmacy</Text>
                    <Text style={styles.featureDescription}>
                      On-site pharmacy available
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },
  featuresContainer: {
    gap: 12,
  },
  featureCard: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featureIcon: {
    fontSize: 32,
  },
  featureInfo: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#666',
  },
});
