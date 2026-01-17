/**
 * StockIndicator Component
 * Displays visual indicator for product stock status
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { StockStatus } from '../../types/inventory.types';

interface StockIndicatorProps {
  /**
   * Stock status
   */
  status: StockStatus;

  /**
   * Show text label
   */
  showLabel?: boolean;

  /**
   * Size variant
   */
  size?: 'small' | 'medium' | 'large';

  /**
   * Optional quantity information
   */
  quantity?: number;

  /**
   * Optional quantity range
   */
  quantityRange?: 'few' | 'some' | 'plenty';

  /**
   * Last updated timestamp
   */
  lastUpdated?: Date;

  /**
   * Show data freshness indicator
   */
  showFreshness?: boolean;
}

export function StockIndicator({
  status,
  showLabel = true,
  size = 'medium',
  quantity,
  quantityRange,
  lastUpdated,
  showFreshness = false,
}: StockIndicatorProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'in_stock':
        return {
          color: '#10B981', // Green
          icon: '✅',
          label: 'In Stock',
          bgColor: '#D1FAE5',
        };
      case 'low_stock':
        return {
          color: '#F59E0B', // Amber
          icon: '⚠️',
          label: 'Low Stock',
          bgColor: '#FEF3C7',
        };
      case 'out_of_stock':
        return {
          color: '#EF4444', // Red
          icon: '❌',
          label: 'Out of Stock',
          bgColor: '#FEE2E2',
        };
      case 'unknown':
      default:
        return {
          color: '#6B7280', // Gray
          icon: '❓',
          label: 'Unknown',
          bgColor: '#F3F4F6',
        };
    }
  };

  const config = getStatusConfig();

  const getQuantityText = () => {
    if (quantity !== undefined && quantity > 0) {
      if (quantity > 10) {
        return '10+ available';
      }
      return `${quantity} available`;
    }

    if (quantityRange) {
      switch (quantityRange) {
        case 'few':
          return 'Few remaining';
        case 'some':
          return 'Some available';
        case 'plenty':
          return 'Plenty available';
      }
    }

    return null;
  };

  const getFreshnessText = () => {
    if (!lastUpdated || !showFreshness) return null;

    const ageMs = Date.now() - lastUpdated.getTime();
    const ageMinutes = Math.floor(ageMs / 1000 / 60);

    if (ageMinutes < 60) {
      return `Updated ${ageMinutes}m ago`;
    }

    const ageHours = Math.floor(ageMinutes / 60);
    if (ageHours < 24) {
      return `Updated ${ageHours}h ago`;
    }

    return 'Data may be stale';
  };

  const sizeConfig = {
    small: {
      height: 24,
      fontSize: 12,
      iconSize: 14,
      padding: 4,
    },
    medium: {
      height: 32,
      fontSize: 14,
      iconSize: 16,
      padding: 8,
    },
    large: {
      height: 40,
      fontSize: 16,
      iconSize: 18,
      padding: 12,
    },
  };

  const currentSize = sizeConfig[size];
  const quantityText = getQuantityText();
  const freshnessText = getFreshnessText();

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.indicator,
          {
            backgroundColor: config.bgColor,
            height: currentSize.height,
            paddingHorizontal: currentSize.padding,
          },
        ]}
      >
        <Text style={{ fontSize: currentSize.iconSize }}>{config.icon}</Text>
        {showLabel && (
          <Text
            style={[
              styles.label,
              {
                color: config.color,
                fontSize: currentSize.fontSize,
                fontWeight: '600',
              },
            ]}
          >
            {config.label}
          </Text>
        )}
      </View>

      {quantityText && (
        <Text style={[styles.quantityText, { fontSize: currentSize.fontSize - 2 }]}>
          {quantityText}
        </Text>
      )}

      {freshnessText && (
        <Text style={[styles.freshnessText, { fontSize: currentSize.fontSize - 2 }]}>
          {freshnessText}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  indicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  label: {
    fontWeight: '600',
  },
  quantityText: {
    color: '#6B7280',
    marginLeft: 4,
  },
  freshnessText: {
    color: '#9CA3AF',
    fontSize: 11,
    marginLeft: 4,
    fontStyle: 'italic',
  },
});
