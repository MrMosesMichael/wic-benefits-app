import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform, FlatList } from 'react-native';
import type { CrossStoreResult } from '@/lib/types';

interface CrossStoreSearchResultsProps {
  results: CrossStoreResult[];
  onStorePress?: (store: CrossStoreResult) => void;
  emptyMessage?: string;
}

const getChainIcon = (chain: string): string => {
  switch (chain.toLowerCase()) {
    case 'walmart': return '🏪';
    case 'target': return '🎯';
    case 'kroger': return '🛒';
    case 'meijer': return '🛍️';
    case 'cvs': return '💊';
    case 'walgreens': return '💊';
    case 'whole_foods': return '🥬';
    case 'costco': return '📦';
    case 'sams_club': return '📦';
    default: return '🏬';
  }
};

const getStatusInfo = (status: string): { color: string; text: string; bgColor: string } => {
  switch (status) {
    case 'in_stock':
      return { color: '#2E7D32', text: 'In Stock', bgColor: '#E8F5E9' };
    case 'low_stock':
      return { color: '#EF6C00', text: 'Low Stock', bgColor: '#FFF3E0' };
    case 'out_of_stock':
      return { color: '#C62828', text: 'Out of Stock', bgColor: '#FFEBEE' };
    default:
      return { color: '#757575', text: 'Unknown', bgColor: '#F5F5F5' };
  }
};

const getLikelihoodInfo = (level: string): { color: string; text: string } => {
  switch (level) {
    case 'always':
      return { color: '#4CAF50', text: 'Usually carries this formula' };
    case 'usually':
      return { color: '#8BC34A', text: 'Often has this formula' };
    case 'sometimes':
      return { color: '#FF9800', text: 'Sometimes carries' };
    case 'rarely':
      return { color: '#F44336', text: 'Rarely has this' };
    default:
      return { color: '#9E9E9E', text: 'Availability unknown' };
  }
};

function StoreCard({ store, onPress }: { store: CrossStoreResult; onPress?: () => void }) {
  const handleCall = () => {
    if (store.phone) {
      Linking.openURL(`tel:${store.phone.replace(/[^\d]/g, '')}`);
    }
  };

  const handleDirections = () => {
    const { latitude, longitude } = store.location;
    const address = `${store.address.street}, ${store.address.city}, ${store.address.state} ${store.address.zip}`;
    const encodedAddress = encodeURIComponent(address);

    const url = Platform.select({
      ios: `maps://app?daddr=${encodedAddress}`,
      android: `geo:${latitude},${longitude}?q=${encodedAddress}`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`
    });

    if (url) {
      Linking.openURL(url);
    }
  };

  const hasAvailability = store.availability !== null;
  const statusInfo = hasAvailability ? getStatusInfo(store.availability!.status) : null;
  const likelihoodInfo = store.likelihood ? getLikelihoodInfo(store.likelihood.level) : null;

  // Border color based on status or likelihood
  let borderColor = '#E0E0E0';
  if (hasAvailability) {
    borderColor = statusInfo!.color;
  } else if (store.likelihood) {
    borderColor = likelihoodInfo!.color;
  }

  return (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: borderColor }]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.storeInfo}>
          <Text style={styles.chainIcon}>{getChainIcon(store.chain)}</Text>
          <View style={styles.storeDetails}>
            <Text style={styles.storeName} numberOfLines={1}>{store.name}</Text>
            <Text style={styles.distance}>{store.distanceMiles} miles away</Text>
          </View>
        </View>
        {store.wicAuthorized && (
          <View style={styles.wicBadge}>
            <Text style={styles.wicBadgeText}>WIC ✓</Text>
          </View>
        )}
      </View>

      {/* Address */}
      <Text style={styles.address} numberOfLines={1}>
        {store.address.street}, {store.address.city}
      </Text>

      {/* Availability Section */}
      <View style={styles.availabilitySection}>
        {hasAvailability ? (
          <>
            {/* Status Badge */}
            <View style={[styles.statusBadge, { backgroundColor: statusInfo!.bgColor }]}>
              <View style={[styles.statusDot, { backgroundColor: statusInfo!.color }]} />
              <Text style={[styles.statusText, { color: statusInfo!.color }]}>
                {statusInfo!.text}
              </Text>
            </View>

            {/* Quantity & Time Info */}
            <View style={styles.reportInfo}>
              {store.availability!.quantityRange && (
                <Text style={styles.quantityText}>
                  {store.availability!.quantityRange === 'plenty' && '📦 Plenty in stock'}
                  {store.availability!.quantityRange === 'some' && '📦 Some available'}
                  {store.availability!.quantityRange === 'few' && '⚠️ Limited supply'}
                </Text>
              )}
              <View style={styles.timeRow}>
                <Text style={styles.timeIcon}>🕐</Text>
                <Text style={styles.timeText}>
                  Reported {store.availability!.lastReportedAgo}
                </Text>
                <Text style={styles.confidenceText}>
                  • {store.availability!.confidence}% confidence
                </Text>
              </View>
            </View>
          </>
        ) : store.likelihood ? (
          <View style={styles.likelihoodRow}>
            <View style={[styles.likelihoodDot, { backgroundColor: likelihoodInfo!.color }]} />
            <Text style={styles.likelihoodText}>{likelihoodInfo!.text}</Text>
          </View>
        ) : (
          <Text style={styles.noDataText}>No recent availability data</Text>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        {store.phone && (
          <TouchableOpacity style={styles.actionButton} onPress={handleCall}>
            <Text style={styles.actionButtonText}>📞 Call</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.actionButtonPrimary} onPress={handleDirections}>
          <Text style={styles.actionButtonPrimaryText}>🗺️ Directions</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export default function CrossStoreSearchResults({
  results,
  onStorePress,
  emptyMessage = 'No stores found'
}: CrossStoreSearchResultsProps) {
  if (results.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🔍</Text>
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      </View>
    );
  }

  // Separate stores with availability from those without
  const storesWithStock = results.filter(s => 
    s.availability?.status === 'in_stock' || s.availability?.status === 'low_stock'
  );
  const storesNoData = results.filter(s => !s.availability);

  return (
    <View style={styles.container}>
      {/* Results Summary */}
      <View style={styles.summary}>
        <Text style={styles.summaryText}>
          {storesWithStock.length > 0 ? (
            <>
              <Text style={styles.summaryHighlight}>{storesWithStock.length}</Text>
              {' '}store{storesWithStock.length !== 1 ? 's' : ''} with recent stock reports
            </>
          ) : (
            `${results.length} stores nearby`
          )}
        </Text>
      </View>

      {/* Results List */}
      <FlatList
        data={results}
        keyExtractor={(item) => item.storeId}
        renderItem={({ item }) => (
          <StoreCard
            store={item}
            onPress={onStorePress ? () => onStorePress(item) : undefined}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  summary: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 14,
    color: '#1565C0',
  },
  summaryHighlight: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  listContent: {
    paddingBottom: 20,
  },
  separator: {
    height: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  storeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  chainIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  storeDetails: {
    flex: 1,
  },
  storeName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#212121',
  },
  distance: {
    fontSize: 13,
    color: '#757575',
    marginTop: 2,
  },
  wicBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  wicBadgeText: {
    color: '#2E7D32',
    fontSize: 11,
    fontWeight: '600',
  },
  address: {
    fontSize: 13,
    color: '#757575',
    marginBottom: 12,
  },
  availabilitySection: {
    marginBottom: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  reportInfo: {
    gap: 4,
  },
  quantityText: {
    fontSize: 13,
    color: '#424242',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  timeText: {
    fontSize: 12,
    color: '#757575',
  },
  confidenceText: {
    fontSize: 12,
    color: '#9E9E9E',
    marginLeft: 4,
  },
  likelihoodRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  likelihoodDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  likelihoodText: {
    fontSize: 13,
    color: '#616161',
  },
  noDataText: {
    fontSize: 13,
    color: '#9E9E9E',
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#424242',
  },
  actionButtonPrimary: {
    flex: 1,
    backgroundColor: '#1976D2',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonPrimaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
  },
});
