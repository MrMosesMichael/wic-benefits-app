/**
 * Store Selection Modal Component
 * Allows manual store search and selection
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Store } from '../types/store.types';
import LocationService from '../services/LocationService';

interface StoreSelectionModalProps {
  visible: boolean;
  nearbyStores: Store[];
  favoriteStores?: Store[];
  recentStores?: Store[];
  onSelectStore: (store: Store) => void;
  onClose: () => void;
  onSearch: (query: string) => Promise<Store[]>;
}

export const StoreSelectionModal: React.FC<StoreSelectionModalProps> = ({
  visible,
  nearbyStores,
  favoriteStores = [],
  recentStores = [],
  onSelectStore,
  onClose,
  onSearch,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Store[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<'nearby' | 'search' | 'favorites'>(
    'nearby'
  );

  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      handleSearch();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const handleSearch = async () => {
    if (searchQuery.trim().length < 2) return;

    setIsSearching(true);
    try {
      const results = await onSearch(searchQuery);
      setSearchResults(results);
      setActiveTab('search');
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectStore = (store: Store) => {
    onSelectStore(store);
    onClose();
    setSearchQuery('');
    setSearchResults([]);
  };

  const getDisplayStores = (): Store[] => {
    switch (activeTab) {
      case 'nearby':
        return nearbyStores;
      case 'search':
        return searchResults;
      case 'favorites':
        return favoriteStores;
      default:
        return [];
    }
  };

  const renderStoreItem = ({ item }: { item: Store }) => {
    return (
      <TouchableOpacity
        style={styles.storeItem}
        onPress={() => handleSelectStore(item)}
      >
        <View style={styles.storeInfo}>
          <Text style={styles.storeName}>{item.name}</Text>
          {item.chain && (
            <Text style={styles.storeChain}>{item.chain}</Text>
          )}
          <Text style={styles.storeAddress}>
            {item.address.street}, {item.address.city}, {item.address.state}{' '}
            {item.address.zip}
          </Text>
          {item.wicAuthorized && (
            <View style={styles.wicBadge}>
              <Text style={styles.wicBadgeText}>WIC Authorized</Text>
            </View>
          )}
        </View>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
    );
  };

  const renderRecentStores = () => {
    if (recentStores.length === 0) return null;

    return (
      <View style={styles.recentSection}>
        <Text style={styles.sectionTitle}>Recent Stores</Text>
        {recentStores.slice(0, 3).map((store) => (
          <TouchableOpacity
            key={store.id}
            style={styles.recentStoreItem}
            onPress={() => handleSelectStore(store)}
          >
            <Text style={styles.recentStoreName}>{store.name}</Text>
            <Text style={styles.recentStoreAddress}>
              {store.address.city}, {store.address.state}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Select Store</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, address, or ZIP"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {isSearching && (
            <ActivityIndicator
              size="small"
              color="#0066CC"
              style={styles.searchLoader}
            />
          )}
        </View>

        {searchQuery.trim().length < 2 && renderRecentStores()}

        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'nearby' && styles.activeTab]}
            onPress={() => setActiveTab('nearby')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'nearby' && styles.activeTabText,
              ]}
            >
              Nearby ({nearbyStores.length})
            </Text>
          </TouchableOpacity>
          {favoriteStores.length > 0 && (
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'favorites' && styles.activeTab,
              ]}
              onPress={() => setActiveTab('favorites')}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'favorites' && styles.activeTabText,
                ]}
              >
                Favorites ({favoriteStores.length})
              </Text>
            </TouchableOpacity>
          )}
          {searchResults.length > 0 && (
            <TouchableOpacity
              style={[styles.tab, activeTab === 'search' && styles.activeTab]}
              onPress={() => setActiveTab('search')}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'search' && styles.activeTabText,
                ]}
              >
                Results ({searchResults.length})
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          data={getDisplayStores()}
          renderItem={renderStoreItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                {activeTab === 'nearby'
                  ? 'No nearby stores found'
                  : activeTab === 'favorites'
                  ? 'No favorite stores yet'
                  : searchQuery.trim().length >= 2
                  ? 'No stores found matching your search'
                  : 'Enter a store name or location to search'}
              </Text>
            </View>
          }
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 16,
    color: '#0066CC',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F5F5F5',
    position: 'relative',
  },
  searchInput: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  searchLoader: {
    position: 'absolute',
    right: 28,
    top: 24,
  },
  recentSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  recentStoreItem: {
    paddingVertical: 8,
  },
  recentStoreName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  recentStoreAddress: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingHorizontal: 16,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#0066CC',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeTabText: {
    color: '#0066CC',
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 20,
  },
  storeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  storeInfo: {
    flex: 1,
  },
  storeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  storeChain: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  storeAddress: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  wicBadge: {
    backgroundColor: '#E8F5E9',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  wicBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
  },
  chevron: {
    fontSize: 24,
    color: '#CCC',
    marginLeft: 8,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 15,
    color: '#999',
    textAlign: 'center',
  },
});
