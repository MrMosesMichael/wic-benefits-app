/**
 * FormulaAvailabilityAlert Component
 * Special alert component for formula availability (critical feature)
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { StockIndicator } from './StockIndicator';
import type { Inventory } from '../../types/inventory.types';

interface StoreAvailability {
  storeId: string;
  storeName: string;
  distance?: number;
  inventory: Inventory;
}

interface FormulaAvailabilityAlertProps {
  /**
   * Formula product name
   */
  formulaName: string;

  /**
   * Formula UPC
   */
  formulaUPC: string;

  /**
   * Stores with availability data
   */
  stores: StoreAvailability[];

  /**
   * Loading state
   */
  loading?: boolean;

  /**
   * Shortage severity
   */
  severity?: 'none' | 'moderate' | 'severe' | 'critical';

  /**
   * Navigate to store details
   */
  onStorePress?: (storeId: string) => void;

  /**
   * Find alternatives action
   */
  onFindAlternatives?: () => void;

  /**
   * Enable alerts action
   */
  onEnableAlerts?: () => void;

  /**
   * Refresh data
   */
  onRefresh?: () => void;
}

export function FormulaAvailabilityAlert({
  formulaName,
  formulaUPC,
  stores,
  loading = false,
  severity = 'none',
  onStorePress,
  onFindAlternatives,
  onEnableAlerts,
  onRefresh,
}: FormulaAvailabilityAlertProps) {
  const inStockStores = stores.filter(s => s.inventory.status === 'in_stock');
  const sortedStores = [...stores].sort((a, b) => {
    // Sort by: in stock first, then by distance
    if (a.inventory.status === 'in_stock' && b.inventory.status !== 'in_stock') return -1;
    if (a.inventory.status !== 'in_stock' && b.inventory.status === 'in_stock') return 1;

    const distA = a.distance ?? Infinity;
    const distB = b.distance ?? Infinity;
    return distA - distB;
  });

  const getSeverityConfig = () => {
    switch (severity) {
      case 'critical':
        return {
          color: '#DC2626',
          bgColor: '#FEE2E2',
          icon: '🔴',
          title: 'CRITICAL SHORTAGE',
          message: 'Formula is extremely limited in your area',
        };
      case 'severe':
        return {
          color: '#EA580C',
          bgColor: '#FFEDD5',
          icon: '🚨',
          title: 'Severe Shortage',
          message: 'Formula availability is very limited',
        };
      case 'moderate':
        return {
          color: '#F59E0B',
          bgColor: '#FEF3C7',
          icon: '⚠️',
          title: 'Moderate Shortage',
          message: 'Some stores may be out of stock',
        };
      default:
        return {
          color: '#10B981',
          bgColor: '#D1FAE5',
          icon: '✅',
          title: 'Available',
          message: 'Formula is available at nearby stores',
        };
    }
  };

  const severityConfig = getSeverityConfig();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: severityConfig.bgColor }]}>
        <Text style={styles.headerIcon}>{severityConfig.icon}</Text>
        <View style={styles.headerText}>
          <Text style={[styles.headerTitle, { color: severityConfig.color }]}>
            {severityConfig.title}
          </Text>
          <Text style={styles.headerSubtitle}>{formulaName}</Text>
        </View>
        {onRefresh && !loading && (
          <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
            <Text style={styles.refreshIcon}>🔄</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Message */}
      <View style={styles.messageContainer}>
        <Text style={styles.message}>{severityConfig.message}</Text>
        {inStockStores.length > 0 && (
          <Text style={styles.availabilityCount}>
            Found at {inStockStores.length} of {stores.length} nearby stores
          </Text>
        )}
      </View>

      {/* Loading State */}
      {loading && (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Checking stores...</Text>
        </View>
      )}

      {/* Store List */}
      {!loading && stores.length > 0 && (
        <ScrollView style={styles.storeList} showsVerticalScrollIndicator={false}>
          {sortedStores.map((store, index) => (
            <TouchableOpacity
              key={`${store.storeId}-${index}`}
              style={styles.storeItem}
              onPress={() => onStorePress?.(store.storeId)}
              disabled={!onStorePress}
            >
              <View style={styles.storeInfo}>
                <Text style={styles.storeName}>{store.storeName}</Text>
                {store.distance !== undefined && (
                  <Text style={styles.storeDistance}>{store.distance.toFixed(1)} mi</Text>
                )}
              </View>

              <StockIndicator
                status={store.inventory.status}
                showLabel={true}
                size="small"
                lastUpdated={store.inventory.lastUpdated}
                showFreshness={false}
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* No Stock Available */}
      {!loading && inStockStores.length === 0 && (
        <View style={styles.noStockContainer}>
          <Text style={styles.noStockIcon}>😞</Text>
          <Text style={styles.noStockText}>
            Formula is currently not in stock at any nearby location
          </Text>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        {/* Critical shortage specific actions */}
        {severity === 'critical' && (
          <View style={styles.criticalActions}>
            <Text style={styles.criticalText}>Urgent: Contact your WIC office immediately</Text>
            <TouchableOpacity style={styles.emergencyButton}>
              <Text style={styles.emergencyButtonText}>📞 Contact WIC Office</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Enable Alerts */}
        {onEnableAlerts && inStockStores.length === 0 && (
          <TouchableOpacity style={styles.alertButton} onPress={onEnableAlerts}>
            <Text style={styles.alertButtonIcon}>🔔</Text>
            <Text style={styles.alertButtonText}>Alert me when formula is available</Text>
          </TouchableOpacity>
        )}

        {/* Find Alternatives */}
        {onFindAlternatives && (
          <TouchableOpacity style={styles.alternativesButton} onPress={onFindAlternatives}>
            <Text style={styles.alternativesButtonText}>Find WIC-Approved Alternatives</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Formula UPC for reference */}
      <Text style={styles.upcText}>UPC: {formulaUPC}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  headerIcon: {
    fontSize: 24,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  refreshButton: {
    padding: 8,
  },
  refreshIcon: {
    fontSize: 20,
  },
  messageContainer: {
    padding: 16,
    paddingTop: 0,
    gap: 4,
  },
  message: {
    fontSize: 14,
    color: '#374151',
  },
  availabilityCount: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  loadingContainer: {
    padding: 16,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  storeList: {
    maxHeight: 200,
    paddingHorizontal: 16,
  },
  storeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  storeInfo: {
    flex: 1,
    gap: 2,
  },
  storeName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  storeDistance: {
    fontSize: 12,
    color: '#6B7280',
  },
  noStockContainer: {
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  noStockIcon: {
    fontSize: 32,
  },
  noStockText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  actions: {
    padding: 16,
    gap: 12,
  },
  criticalActions: {
    gap: 8,
    padding: 12,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
  },
  criticalText: {
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '600',
    textAlign: 'center',
  },
  emergencyButton: {
    backgroundColor: '#DC2626',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  emergencyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  alertButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  alertButtonIcon: {
    fontSize: 18,
  },
  alertButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  alternativesButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  alternativesButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
  },
  upcText: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    fontSize: 11,
    color: '#9CA3AF',
    fontFamily: 'monospace',
  },
});
