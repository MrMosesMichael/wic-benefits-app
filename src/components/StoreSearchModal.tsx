/**
 * Store Search Modal Component
 * Modal for searching and selecting stores manually
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Store } from '../types/store.types';
import { useStoreDetection } from '../hooks/useStoreDetection';

interface StoreSearchModalProps {
  visible: boolean;
  onStoreSelect: (store: Store) => void;
  onClose: () => void;
  isFavorite: (storeId: string) => boolean;
  onToggleFavorite: (store: Store) => Promise<boolean>;
}

export const StoreSearchModal: React.FC<StoreSearchModalProps> = ({
  visible,
  onStoreSelect,
  onClose,
  isFavorite,
  onToggleFavorite,
}) => {
  const { searchStores } = useStoreDetection();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Store[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  /**
   * Handle search
   */
  const handleSearch = useCallback(async () => {
    if (!query.trim()) {
      return;
    }

    setIsSearching(true);
    setHasSearched(true);

    try {
      const searchResults = await searchStores(query);
      setResults(searchResults);
    } catch (err) {
      console.error('Search failed:', err);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [query, searchStores]);

  /**
   * Handle query change
   */
  const handleQueryChange = (text: string) => {
    setQuery(text);
    // Reset searched state if query is cleared
    if (!text.trim()) {
      setHasSearched(false);
      setResults([]);
    }
  };

  /**
   * Handle store selection
   */
  const handleStoreSelect = (store: Store) => {
    onStoreSelect(store);
    // Reset state
    setQuery('');
    setResults([]);
    setHasSearched(false);
  };

  /**
   * Handle modal close
   */
  const handleClose = () => {
    // Reset state
    setQuery('');
    setResults([]);
    setHasSearched(false);
    onClose();
  };

  /**
   * Handle toggle favorite
   */
  const handleToggleFavorite = async (
    store: Store,
    event: any
  ) => {
    event.stopPropagation();
    await onToggleFavorite(store);
  };

  /**
   * Render store item
   */
  const renderStore = ({ item }: { item: Store }) => {
    const isFav = isFavorite(item.id);

    return (
      <TouchableOpacity
        style={styles.storeItem}
        onPress={() => handleStoreSelect(item)}
      >
        <View style={styles.storeContent}>
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
            {item.address.street}, {item.address.city}, {item.address.state}
          </Text>

          <View style={styles.storeBadges}>
            {item.wicAuthorized && (
              <View style={styles.wicBadge}>
                <Text style={styles.wicBadgeText}>✓ WIC</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Find Store</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Search Input */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Store name, address, or ZIP code"
            value={query}
            onChangeText={handleQueryChange}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            autoFocus={true}
          />
          <TouchableOpacity
            style={[
              styles.searchButton,
              !query.trim() && styles.searchButtonDisabled,
            ]}
            onPress={handleSearch}
            disabled={!query.trim() || isSearching}
          >
            {isSearching ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.searchButtonText}>Search</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Results */}
        <View style={styles.resultsContainer}>
          {isSearching && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4CAF50" />
              <Text style={styles.loadingText}>Searching...</Text>
            </View>
          )}

          {!isSearching && hasSearched && results.length === 0 && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No stores found</Text>
              <Text style={styles.emptyMessage}>
                Try searching with a different name, address, or ZIP code
              </Text>
            </View>
          )}

          {!isSearching && !hasSearched && (
            <View style={styles.instructionsContainer}>
              <Text style={styles.instructionsTitle}>
                Search for a store
              </Text>
              <Text style={styles.instructionsText}>
                Enter a store name, address, city, or ZIP code to find
                WIC-authorized stores.
              </Text>
              <View style={styles.examplesContainer}>
                <Text style={styles.examplesTitle}>Examples:</Text>
                <Text style={styles.exampleText}>• Walmart</Text>
                <Text style={styles.exampleText}>• 123 Main St</Text>
                <Text style={styles.exampleText}>• Ann Arbor, MI</Text>
                <Text style={styles.exampleText}>• 48104</Text>
              </View>
            </View>
          )}

          {!isSearching && results.length > 0 && (
            <FlatList
              data={results}
              renderItem={renderStore}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#666',
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFF',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  searchInput: {
    flex: 1,
    height: 44,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#333',
  },
  searchButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  searchButtonDisabled: {
    backgroundColor: '#CCC',
  },
  searchButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resultsContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  instructionsContainer: {
    flex: 1,
    padding: 32,
  },
  instructionsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  instructionsText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 24,
  },
  examplesContainer: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  examplesTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  exampleText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  storeItem: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  storeContent: {
    padding: 16,
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
  },
  storeAddress: {
    fontSize: 13,
    color: '#666',
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
});
