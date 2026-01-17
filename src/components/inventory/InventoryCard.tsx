/**
 * InventoryCard Component
 * Card displaying product information with inventory status
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { StockIndicator } from './StockIndicator';
import type { Inventory } from '../../types/inventory.types';

interface InventoryCardProps {
  /**
   * Product UPC
   */
  upc: string;

  /**
   * Product name
   */
  productName: string;

  /**
   * Product brand
   */
  brand?: string;

  /**
   * Product image URL
   */
  imageUrl?: string;

  /**
   * Inventory data
   */
  inventory: Inventory | null;

  /**
   * Loading state
   */
  loading?: boolean;

  /**
   * Error state
   */
  error?: Error | null;

  /**
   * Optional aisle location
   */
  aisle?: string;

  /**
   * Action button text
   */
  actionText?: string;

  /**
   * Action button handler
   */
  onAction?: () => void;

  /**
   * Card press handler
   */
  onPress?: () => void;

  /**
   * Show alternative suggestions when out of stock
   */
  showAlternatives?: boolean;

  /**
   * Alternative action handler
   */
  onFindAlternatives?: () => void;

  /**
   * Refresh inventory handler
   */
  onRefresh?: () => void;
}

export function InventoryCard({
  upc,
  productName,
  brand,
  imageUrl,
  inventory,
  loading = false,
  error = null,
  aisle,
  actionText = 'Add to Cart',
  onAction,
  onPress,
  showAlternatives = true,
  onFindAlternatives,
  onRefresh,
}: InventoryCardProps) {
  const canAddToCart = inventory?.status === 'in_stock' || inventory?.status === 'low_stock';

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      {/* Product Image */}
      {imageUrl && (
        <View style={styles.imageContainer}>
          <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="contain" />
        </View>
      )}

      <View style={styles.content}>
        {/* Product Info */}
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>
            {productName}
          </Text>
          {brand && (
            <Text style={styles.brand} numberOfLines={1}>
              {brand}
            </Text>
          )}
          <Text style={styles.upc}>UPC: {upc}</Text>
        </View>

        {/* Inventory Status */}
        <View style={styles.inventorySection}>
          {loading && (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Checking availability...</Text>
            </View>
          )}

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>Unable to check availability</Text>
              {onRefresh && (
                <TouchableOpacity onPress={onRefresh}>
                  <Text style={styles.retryText}>Tap to retry</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {!loading && !error && inventory && (
            <>
              <StockIndicator
                status={inventory.status}
                showLabel={true}
                size="medium"
                quantity={inventory.quantity}
                quantityRange={inventory.quantityRange}
                lastUpdated={inventory.lastUpdated}
                showFreshness={true}
              />

              {/* Aisle Location */}
              {aisle && inventory.status !== 'out_of_stock' && (
                <View style={styles.aisleContainer}>
                  <Text style={styles.aisleIcon}>📍</Text>
                  <Text style={styles.aisleText}>Aisle {aisle}</Text>
                </View>
              )}

              {/* Confidence Indicator */}
              {inventory.confidence < 70 && (
                <Text style={styles.lowConfidenceText}>
                  ⓘ Data confidence: {inventory.confidence}%
                </Text>
              )}
            </>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {/* Add to Cart / Primary Action */}
          {!loading && !error && inventory && (
            <>
              {canAddToCart && onAction && (
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    inventory.status === 'low_stock' && styles.actionButtonWarning,
                  ]}
                  onPress={onAction}
                >
                  <Text style={styles.actionButtonText}>{actionText}</Text>
                </TouchableOpacity>
              )}

              {/* Out of Stock Actions */}
              {inventory.status === 'out_of_stock' && (
                <View style={styles.outOfStockActions}>
                  <Text style={styles.outOfStockText}>
                    This item is currently unavailable at this store
                  </Text>

                  {showAlternatives && onFindAlternatives && (
                    <TouchableOpacity
                      style={styles.alternativesButton}
                      onPress={onFindAlternatives}
                    >
                      <Text style={styles.alternativesButtonText}>
                        Check Nearby Stores or Find Alternatives
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  image: {
    width: 100,
    height: 100,
  },
  content: {
    gap: 12,
  },
  productInfo: {
    gap: 4,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  brand: {
    fontSize: 14,
    color: '#6B7280',
  },
  upc: {
    fontSize: 12,
    color: '#9CA3AF',
    fontFamily: 'monospace',
  },
  inventorySection: {
    gap: 8,
  },
  loadingContainer: {
    paddingVertical: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  errorContainer: {
    paddingVertical: 8,
    gap: 4,
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
  },
  retryText: {
    fontSize: 13,
    color: '#3B82F6',
    textDecorationLine: 'underline',
  },
  aisleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  aisleIcon: {
    fontSize: 14,
  },
  aisleText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  lowConfidenceText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  actions: {
    gap: 8,
  },
  actionButton: {
    backgroundColor: '#10B981',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonWarning: {
    backgroundColor: '#F59E0B',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  outOfStockActions: {
    gap: 8,
  },
  outOfStockText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  alternativesButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  alternativesButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
});
