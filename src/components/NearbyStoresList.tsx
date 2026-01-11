/**
 * Nearby Stores List Component
 * Displays a list of nearby stores with distance and WIC authorization status
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from 'react-native';
import { Store } from '../types/store.types';

interface NearbyStoresListProps {
  stores: Store[];
  onStoreSelect: (store: Store) => void;
  currentStoreId?: string;
  isFavorite: (storeId: string) => boolean;
  onToggleFavorite: (store: Store) => Promise<boolean>;
}

export const NearbyStoresList: React.FC<NearbyStoresListProps> = ({
  stores,
  onStoreSelect,
  currentStoreId,
  isFavorite,
  onToggleFavorite,
}) => {
  const handleToggleFavorite = async (
    store: Store,
    event: any
  ) => {
    event.stopPropagation();
    await onToggleFavorite(store);
  };

  const renderStore = ({ item }: { item: Store }) => {
    const isCurrentStore = item.id === currentStoreId;
    const isFav = isFavorite(item.id);

    return (
      <TouchableOpacity
        style={[
          styles.storeCard,
          isCurrentStore && styles.currentStoreCard,
        ]}
        onPress={() => onStoreSelect(item)}
        disabled={isCurrentStore}
      >
        <View style={styles.storeHeader}>
          <View style={styles.storeInfo}>
            <Text style={styles.storeName}>{item.name}</Text>
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
          {item.address.street}
          {'\n'}
          {item.address.city}, {item.address.state} {item.address.zip}
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

        {isCurrentStore && (
          <View style={styles.currentBadge}>
            <Text style={styles.currentBadgeText}>Current Store</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (stores.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No nearby stores found</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={stores}
      renderItem={renderStore}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      scrollEnabled={false}
    />
  );
};

const styles = StyleSheet.create({
  listContent: {
    gap: 12,
  },
  storeCard: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  currentStoreCard: {
    borderColor: '#4CAF50',
    borderWidth: 2,
    backgroundColor: '#F1F8F4',
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
  storeName: {
    fontSize: 16,
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
    color: '#666',
    lineHeight: 18,
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
  currentBadge: {
    marginTop: 12,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  currentBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFF',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});
