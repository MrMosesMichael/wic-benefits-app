/**
 * Current Store Display Component
 * Compact display of the currently selected store
 * Used in headers and summary views
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Store } from '../types/store.types';

interface CurrentStoreDisplayProps {
  store: Store | null;
  confidence?: number;
  onPress?: () => void;
  showChangeButton?: boolean;
  compact?: boolean;
}

export const CurrentStoreDisplay: React.FC<CurrentStoreDisplayProps> = ({
  store,
  confidence = 100,
  onPress,
  showChangeButton = true,
  compact = false,
}) => {
  if (!store) {
    return (
      <TouchableOpacity
        style={[styles.container, styles.noStoreContainer]}
        onPress={onPress}
        disabled={!onPress}
      >
        <View style={styles.content}>
          <Text style={styles.noStoreText}>No store selected</Text>
          {showChangeButton && (
            <Text style={styles.tapToSelectText}>Tap to select store</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  if (compact) {
    return (
      <TouchableOpacity
        style={[styles.container, styles.compactContainer]}
        onPress={onPress}
        disabled={!onPress}
      >
        <View style={styles.compactContent}>
          <View style={styles.storeIcon}>
            <Text style={styles.storeIconText}>🏪</Text>
          </View>
          <View style={styles.compactInfo}>
            <Text style={styles.compactStoreName} numberOfLines={1}>
              {store.name}
            </Text>
            <Text style={styles.compactStoreCity} numberOfLines={1}>
              {store.address.city}
            </Text>
          </View>
          {showChangeButton && (
            <View style={styles.changeIndicator}>
              <Text style={styles.changeIndicatorText}>›</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.content}>
        <View style={styles.storeInfo}>
          <View style={styles.storeHeader}>
            <Text style={styles.storeName}>{store.name}</Text>
            {confidence < 100 && (
              <View style={styles.confidenceBadge}>
                <Text style={styles.confidenceText}>{confidence}%</Text>
              </View>
            )}
          </View>

          {store.chain && (
            <Text style={styles.storeChain}>{store.chain}</Text>
          )}

          <Text style={styles.storeAddress}>
            {store.address.street}, {store.address.city}
          </Text>

          <View style={styles.badges}>
            {store.wicAuthorized && (
              <View style={styles.wicBadge}>
                <Text style={styles.wicBadgeText}>✓ WIC</Text>
              </View>
            )}

            {store.inventoryApiAvailable && (
              <View style={styles.inventoryBadge}>
                <Text style={styles.inventoryBadgeText}>Live Inventory</Text>
              </View>
            )}
          </View>
        </View>

        {showChangeButton && (
          <View style={styles.changeButton}>
            <Text style={styles.changeButtonText}>Change</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  noStoreContainer: {
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
  },
  compactContainer: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  content: {
    padding: 16,
  },
  noStoreText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
    textAlign: 'center',
    marginBottom: 4,
  },
  tapToSelectText: {
    fontSize: 13,
    color: '#0066CC',
    textAlign: 'center',
  },
  compactContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  storeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  storeIconText: {
    fontSize: 20,
  },
  compactInfo: {
    flex: 1,
  },
  compactStoreName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  compactStoreCity: {
    fontSize: 13,
    color: '#666',
  },
  changeIndicator: {
    marginLeft: 8,
  },
  changeIndicatorText: {
    fontSize: 24,
    color: '#999',
  },
  storeInfo: {
    flex: 1,
  },
  storeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  storeName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    flex: 1,
  },
  confidenceBadge: {
    backgroundColor: '#FFA500',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },
  storeChain: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  storeAddress: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
  },
  badges: {
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
  changeButton: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0066CC',
    alignSelf: 'flex-start',
  },
  changeButtonText: {
    color: '#0066CC',
    fontSize: 14,
    fontWeight: '600',
  },
});
