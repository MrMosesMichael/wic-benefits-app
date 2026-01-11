/**
 * Store Location Banner Component
 * Persistent banner showing current store location
 * Appears at top of main screens with quick store switching
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Store } from '../types/store.types';

interface StoreLocationBannerProps {
  store: Store | null;
  onPress?: () => void;
  showLocationIcon?: boolean;
  style?: any;
}

export const StoreLocationBanner: React.FC<StoreLocationBannerProps> = ({
  store,
  onPress,
  showLocationIcon = true,
  style,
}) => {
  if (!store) {
    return (
      <TouchableOpacity
        style={[styles.banner, styles.noStoreBanner, style]}
        onPress={onPress}
        disabled={!onPress}
      >
        <View style={styles.noStoreContent}>
          {showLocationIcon && (
            <Text style={styles.locationIcon}>📍</Text>
          )}
          <View style={styles.noStoreTextContainer}>
            <Text style={styles.noStoreText}>No store selected</Text>
            <Text style={styles.tapToSelectText}>Tap to select a store</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.banner, styles.storeBanner, style]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.storeContent}>
        {showLocationIcon && (
          <Text style={styles.locationIcon}>📍</Text>
        )}
        <View style={styles.storeTextContainer}>
          <Text style={styles.storeLabel}>Shopping at</Text>
          <Text style={styles.storeName} numberOfLines={1}>
            {store.name}
          </Text>
          <Text style={styles.storeCity} numberOfLines={1}>
            {store.address.city}, {store.address.state}
          </Text>
        </View>
        {onPress && (
          <View style={styles.changeIndicator}>
            <Text style={styles.changeText}>›</Text>
          </View>
        )}
      </View>

      {store.wicAuthorized && (
        <View style={styles.wicIndicator}>
          <Text style={styles.wicIndicatorText}>✓ WIC</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  banner: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  noStoreBanner: {
    backgroundColor: '#FFF9E6',
    borderBottomColor: '#FFE082',
  },
  storeBanner: {
    backgroundColor: '#FFF',
  },
  noStoreContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  noStoreTextContainer: {
    flex: 1,
  },
  noStoreText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
    marginBottom: 2,
  },
  tapToSelectText: {
    fontSize: 13,
    color: '#0066CC',
  },
  storeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  locationIcon: {
    fontSize: 24,
  },
  storeTextContainer: {
    flex: 1,
  },
  storeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  storeName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 2,
  },
  storeCity: {
    fontSize: 13,
    color: '#666',
  },
  changeIndicator: {
    marginLeft: 8,
  },
  changeText: {
    fontSize: 28,
    color: '#999',
  },
  wicIndicator: {
    alignSelf: 'flex-start',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 36,
  },
  wicIndicatorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
  },
});
