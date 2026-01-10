/**
 * Home Screen
 * Main app screen with integrated store detection
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useStoreDetection } from '../hooks/useStoreDetection';
import { StoreDetectionBanner } from '../components/StoreDetectionBanner';
import { StoreSelectionModal } from '../components/StoreSelectionModal';

export const HomeScreen: React.FC = () => {
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

  const [showStoreSelection, setShowStoreSelection] = useState(false);

  useEffect(() => {
    // Check permissions and detect store on mount
    initializeStoreDetection();

    // Start continuous detection
    startContinuousDetection();

    // Cleanup on unmount
    return () => {
      stopContinuousDetection();
    };
  }, []);

  useEffect(() => {
    if (error) {
      Alert.alert('Error', error.message, [{ text: 'OK' }]);
    }
  }, [error]);

  const initializeStoreDetection = async () => {
    if (permissionStatus?.granted) {
      await detectStore();
    }
  };

  const handleConfirmStore = () => {
    if (currentStore) {
      confirmStore(currentStore.id);
    }
  };

  const handleChangeStore = () => {
    setShowStoreSelection(true);
  };

  const handleRequestPermissions = async () => {
    await requestPermissions();
  };

  const handleSearchStores = async (query: string) => {
    return await searchStores(query);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StoreDetectionBanner
        currentStore={currentStore}
        isDetecting={isDetecting}
        confidence={confidence}
        requiresConfirmation={requiresConfirmation}
        onConfirm={handleConfirmStore}
        onChangeStore={handleChangeStore}
        onRequestPermissions={handleRequestPermissions}
        permissionDenied={permissionStatus?.granted === false}
      />

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <TouchableOpacity style={styles.actionCard}>
            <View style={styles.actionIcon}>
              <Text style={styles.actionIconText}>📷</Text>
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Scan Product</Text>
              <Text style={styles.actionDescription}>
                Check if a product is WIC-eligible
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard}>
            <View style={styles.actionIcon}>
              <Text style={styles.actionIconText}>🛒</Text>
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Shopping Cart</Text>
              <Text style={styles.actionDescription}>
                View and manage your cart
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard}>
            <View style={styles.actionIcon}>
              <Text style={styles.actionIconText}>💳</Text>
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>My Benefits</Text>
              <Text style={styles.actionDescription}>
                View your WIC benefits balance
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {currentStore && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Store Information</Text>
            <View style={styles.storeInfoCard}>
              <Text style={styles.storeInfoLabel}>Store Name</Text>
              <Text style={styles.storeInfoValue}>{currentStore.name}</Text>

              <Text style={styles.storeInfoLabel}>Address</Text>
              <Text style={styles.storeInfoValue}>
                {currentStore.address.street}
                {'\n'}
                {currentStore.address.city}, {currentStore.address.state}{' '}
                {currentStore.address.zip}
              </Text>

              {currentStore.phone && (
                <>
                  <Text style={styles.storeInfoLabel}>Phone</Text>
                  <Text style={styles.storeInfoValue}>
                    {currentStore.phone}
                  </Text>
                </>
              )}

              {currentStore.features.acceptsWic && (
                <View style={styles.wicAuthorizedBadge}>
                  <Text style={styles.wicAuthorizedText}>
                    ✓ WIC Authorized Retailer
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Need Help?</Text>
          <TouchableOpacity style={styles.helpCard}>
            <Text style={styles.helpTitle}>WIC Rules & FAQ</Text>
            <Text style={styles.helpDescription}>
              Learn about WIC eligibility and shopping guidelines
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <StoreSelectionModal
        visible={showStoreSelection}
        nearbyStores={nearbyStores}
        onSelectStore={(store) => {
          selectStore(store);
          setShowStoreSelection(false);
        }}
        onClose={() => setShowStoreSelection(false)}
        onSearch={handleSearchStores}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionIconText: {
    fontSize: 24,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 13,
    color: '#666',
  },
  storeInfoCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
  },
  storeInfoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginTop: 12,
    marginBottom: 4,
  },
  storeInfoValue: {
    fontSize: 15,
    color: '#333',
  },
  wicAuthorizedBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 16,
    alignSelf: 'flex-start',
  },
  wicAuthorizedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
  helpCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0066CC',
    marginBottom: 4,
  },
  helpDescription: {
    fontSize: 13,
    color: '#0066CC',
  },
});
