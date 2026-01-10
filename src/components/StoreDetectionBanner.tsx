/**
 * Store Detection Banner Component
 * Displays current detected store and allows store selection
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Store } from '../types/store.types';

interface StoreDetectionBannerProps {
  currentStore: Store | null;
  isDetecting: boolean;
  confidence: number;
  requiresConfirmation: boolean;
  onConfirm: () => void;
  onChangeStore: () => void;
  onRequestPermissions?: () => void;
  permissionDenied?: boolean;
}

export const StoreDetectionBanner: React.FC<StoreDetectionBannerProps> = ({
  currentStore,
  isDetecting,
  confidence,
  requiresConfirmation,
  onConfirm,
  onChangeStore,
  onRequestPermissions,
  permissionDenied = false,
}) => {
  if (permissionDenied && onRequestPermissions) {
    return (
      <View style={styles.banner}>
        <View style={styles.content}>
          <Text style={styles.noStoreText}>Location access needed</Text>
          <Text style={styles.addressText}>
            Enable location to detect your store automatically
          </Text>
        </View>
        <TouchableOpacity
          style={styles.enableButton}
          onPress={onRequestPermissions}
        >
          <Text style={styles.enableButtonText}>Enable</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isDetecting) {
    return (
      <View style={styles.banner}>
        <ActivityIndicator size="small" color="#0066CC" />
        <Text style={styles.detectingText}>Detecting store...</Text>
      </View>
    );
  }

  if (!currentStore) {
    return (
      <View style={styles.banner}>
        <View style={styles.content}>
          <Text style={styles.noStoreText}>No store detected</Text>
          <Text style={styles.addressText}>
            Tap to search for your store manually
          </Text>
        </View>
        <TouchableOpacity
          style={styles.changeButton}
          onPress={onChangeStore}
        >
          <Text style={styles.changeButtonText}>Find Store</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.banner}>
      <View style={styles.content}>
        <View style={styles.storeHeader}>
          <Text style={styles.storeName}>{currentStore.name}</Text>
          {confidence < 100 && (
            <View style={styles.confidenceBadge}>
              <Text style={styles.confidenceText}>{confidence}%</Text>
            </View>
          )}
        </View>
        <Text style={styles.addressText}>
          {currentStore.address.street}, {currentStore.address.city}
        </Text>
      </View>
      <View style={styles.actions}>
        {requiresConfirmation && (
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={onConfirm}
          >
            <Text style={styles.confirmButtonText}>Confirm</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.changeButton}
          onPress={onChangeStore}
        >
          <Text style={styles.changeButtonText}>Change</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#F5F5F5',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    marginRight: 12,
  },
  storeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  storeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginRight: 8,
  },
  confidenceBadge: {
    backgroundColor: '#FFA500',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  confidenceText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFF',
  },
  addressText: {
    fontSize: 13,
    color: '#666',
  },
  noStoreText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
    marginBottom: 4,
  },
  detectingText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  confirmButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  changeButton: {
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#0066CC',
  },
  changeButtonText: {
    color: '#0066CC',
    fontSize: 14,
    fontWeight: '600',
  },
  enableButton: {
    backgroundColor: '#0066CC',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  enableButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
