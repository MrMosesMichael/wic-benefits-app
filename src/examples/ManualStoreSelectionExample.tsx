/**
 * Manual Store Selection Example
 * Demonstrates Task H5: Manual store selection with search and favorites
 *
 * This example shows:
 * - Search for stores by name, address, city, or ZIP
 * - Use current location to find nearby stores
 * - Manage favorite stores
 * - Set default store
 * - View recent stores
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { StoreProvider } from '../contexts/StoreContext';
import { ManualStoreSelectionScreen } from '../screens/ManualStoreSelectionScreen';

/**
 * Example demonstrating manual store selection
 */
export const ManualStoreSelectionExample: React.FC = () => {
  const handleStoreSelected = (store: any) => {
    console.log('Store selected:', store);
  };

  return (
    <StoreProvider>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Manual Store Selection</Text>
          <Text style={styles.subtitle}>Task H5 Implementation</Text>
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>Features Demonstrated:</Text>
            <Text style={styles.infoItem}>
              ✓ Search stores by name, address, city, or ZIP code
            </Text>
            <Text style={styles.infoItem}>
              ✓ Find stores near current location
            </Text>
            <Text style={styles.infoItem}>
              ✓ Quick access to favorite stores
            </Text>
            <Text style={styles.infoItem}>
              ✓ Recently visited stores list
            </Text>
            <Text style={styles.infoItem}>
              ✓ Set default store for quick selection
            </Text>
            <Text style={styles.infoItem}>
              ✓ Distance calculation and display
            </Text>
            <Text style={styles.infoItem}>
              ✓ Two search modes: text search and nearby search
            </Text>
          </View>

          <View style={styles.exampleContainer}>
            <ManualStoreSelectionScreen
              onStoreSelected={handleStoreSelected}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </StoreProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#4CAF50',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#388E3C',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#E8F5E9',
  },
  content: {
    flex: 1,
  },
  infoSection: {
    backgroundColor: '#FFF',
    padding: 20,
    margin: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  infoItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  exampleContainer: {
    flex: 1,
    marginTop: 16,
  },
});

export default ManualStoreSelectionExample;
