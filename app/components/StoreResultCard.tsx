import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import type { StoreResult, LikelihoodLevel } from '@/lib/types';
import { useTranslation } from '@/lib/i18n/I18nContext';
import { colors } from '@/lib/theme';

interface StoreResultCardProps {
  store: StoreResult;
  onReport?: (store: StoreResult) => void;
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

const getLikelihoodInfo = (level: LikelihoodLevel): { color: string; text: string } => {
  switch (level) {
    case 'always': return { color: colors.success, text: 'Always carries this formula' };
    case 'usually': return { color: '#8BC34A', text: 'Usually has this formula' };
    case 'sometimes': return { color: colors.warning, text: 'Sometimes carries this formula' };
    case 'rarely': return { color: colors.danger, text: 'Rarely has this formula' };
    default: return { color: colors.consumed, text: 'Unknown availability' };
  }
};

const getStatusInfo = (status: string): { color: string; text: string; icon: string } => {
  switch (status) {
    case 'in_stock': return { color: colors.success, text: 'In Stock', icon: '✓' };
    case 'low_stock': return { color: colors.warning, text: 'Low Stock', icon: '⚠️' };
    case 'out_of_stock': return { color: colors.danger, text: 'Out of Stock', icon: '✗' };
    default: return { color: colors.consumed, text: 'Unknown', icon: '?' };
  }
};

const formatTimeAgo = (timestamp: string): string => {
  const hours = (Date.now() - new Date(timestamp).getTime()) / (1000 * 60 * 60);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${Math.round(hours)}h ago`;
  return `${Math.round(hours / 24)}d ago`;
};

export default function StoreResultCard({ store, onReport }: StoreResultCardProps) {
  const t = useTranslation();

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

  const hasCrowdsourcedData = store.crowdsourced !== null;
  const statusInfo = hasCrowdsourcedData ? getStatusInfo(store.crowdsourced!.status) : null;
  const likelihoodInfo = store.likelihood ? getLikelihoodInfo(store.likelihood.level) : null;

  // Determine border color based on data
  let borderColor: string = colors.border;
  if (hasCrowdsourcedData) {
    borderColor = statusInfo!.color;
  } else if (store.likelihood) {
    borderColor = likelihoodInfo!.color;
  }

  return (
    <View
      style={[styles.card, { borderLeftColor: borderColor }]}
      accessibilityLabel={`${store.name}, ${t('a11y.storeCard.milesAwayLabel', { distance: store.distanceMiles })}${hasCrowdsourcedData ? ', ' + statusInfo!.text : store.likelihood ? ', ' + likelihoodInfo!.text : ''}${store.wicAuthorized ? ', ' + t('a11y.storeCard.wicAuthorizedLabel') : ''}`}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.storeInfo}>
          <Text style={styles.chainIcon} accessible={false} importantForAccessibility="no">{getChainIcon(store.chain)}</Text>
          <View style={styles.storeNameContainer}>
            <Text style={styles.storeName}>{store.name}</Text>
            <Text style={styles.distance}>{store.distanceMiles} mi</Text>
          </View>
        </View>
        {store.wicAuthorized && (
          <View style={styles.wicBadge}>
            <Text style={styles.wicBadgeText}>WIC</Text>
          </View>
        )}
      </View>

      {/* Address */}
      <Text style={styles.address}>
        {store.address.street}, {store.address.city}, {store.address.state}
      </Text>

      {/* Availability Info */}
      <View style={styles.availabilitySection}>
        {hasCrowdsourcedData ? (
          <>
            <View style={[styles.statusBadge, { backgroundColor: statusInfo!.color }]}>
              <Text style={styles.statusBadgeText}>
                {statusInfo!.icon} {statusInfo!.text}
              </Text>
            </View>
            <View style={styles.crowdsourcedMeta}>
              {store.crowdsourced!.quantityRange && (
                <Text style={styles.metaText}>
                  {store.crowdsourced!.quantityRange === 'plenty' && '📦 Plenty available'}
                  {store.crowdsourced!.quantityRange === 'some' && '📦 Some available'}
                  {store.crowdsourced!.quantityRange === 'few' && '⚠️ Limited quantity'}
                </Text>
              )}
              <Text style={styles.metaText}>
                {formatTimeAgo(store.crowdsourced!.lastUpdated)} • {store.crowdsourced!.confidence}% confidence
              </Text>
            </View>
          </>
        ) : store.likelihood ? (
          <View style={styles.likelihoodInfo}>
            <View style={[styles.likelihoodDot, { backgroundColor: likelihoodInfo!.color }]} />
            <Text style={styles.likelihoodText}>{likelihoodInfo!.text}</Text>
          </View>
        ) : (
          <Text style={styles.noDataText}>No availability data</Text>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {store.phone && (
          <TouchableOpacity style={styles.actionButton} onPress={handleCall} accessibilityRole="button" accessibilityLabel={t('a11y.storeCard.callLabel')}>
            <Text style={styles.actionButtonText}>📞 Call</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.actionButtonPrimary} onPress={handleDirections} accessibilityRole="button" accessibilityLabel={t('a11y.storeCard.directionsLabel')}>
          <Text style={styles.actionButtonPrimaryText}>🗺️ Directions</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  header: {
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
    fontSize: 24,
    marginRight: 10,
  },
  storeNameContainer: {
    flex: 1,
  },
  storeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.navy,
  },
  distance: {
    fontSize: 13,
    color: colors.muted,
  },
  wicBadge: {
    backgroundColor: colors.success,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  wicBadgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: 'bold',
  },
  address: {
    fontSize: 13,
    color: colors.muted,
    marginBottom: 12,
  },
  availabilitySection: {
    marginBottom: 12,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 8,
  },
  statusBadgeText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  crowdsourcedMeta: {
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: colors.muted,
  },
  likelihoodInfo: {
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
    color: colors.muted,
  },
  noDataText: {
    fontSize: 13,
    color: colors.muted,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: colors.screenBg,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.navy,
  },
  actionButtonPrimary: {
    flex: 1,
    backgroundColor: colors.dustyBlue,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonPrimaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
});
