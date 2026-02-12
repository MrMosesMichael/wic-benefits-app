import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import type { FormulaAlternative } from '@/lib/types';
import { useTranslation } from '@/lib/i18n/I18nContext';

interface FormulaAlternativesProps {
  alternatives: FormulaAlternative[];
  loading?: boolean;
  onAlternativePress?: (alternative: FormulaAlternative) => void;
  showAvailability?: boolean;
}

export default function FormulaAlternatives({
  alternatives,
  loading = false,
  onAlternativePress,
  showAvailability = false
}: FormulaAlternativesProps) {
  const t = useTranslation();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1976D2" />
        <Text style={styles.loadingText}>{t('alternatives.loading')}</Text>
      </View>
    );
  }

  if (alternatives.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon} accessible={false} importantForAccessibility="no">🍼</Text>
        <Text style={styles.emptyText}>{t('alternatives.noAlternatives')}</Text>
      </View>
    );
  }

  const formatTimeAgo = (timestamp: string) => {
    const hours = (Date.now() - new Date(timestamp).getTime()) / (1000 * 60 * 60);
    if (hours < 1) return t('result.justNow');
    if (hours < 24) return t('result.hoursAgo', { hours: Math.round(hours) });
    return `${Math.round(hours / 24)}d ${t('common.ago')}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_stock': return '#4CAF50';
      case 'low_stock': return '#FF9800';
      case 'out_of_stock': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'in_stock': return t('crossStoreResults.inStock');
      case 'low_stock': return t('crossStoreResults.lowStock');
      case 'out_of_stock': return t('crossStoreResults.outOfStock');
      default: return t('crossStoreResults.availabilityUnknown');
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Medical Disclaimer */}
      <View style={styles.disclaimerCard}>
        <Text style={styles.disclaimerIcon} accessible={false} importantForAccessibility="no">⚕️</Text>
        <View style={styles.disclaimerTextContainer}>
          <Text style={styles.disclaimerTitle}>{t('alternatives.disclaimerTitle')}</Text>
          <Text style={styles.disclaimerText}>
            {t('alternatives.disclaimerText')}
          </Text>
        </View>
      </View>

      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t('alternatives.suggestedAlternatives')}</Text>
        <Text style={styles.sectionSubtitle}>
          {t('alternatives.foundCount', { count: alternatives.length })}
        </Text>
      </View>

      {/* Alternative Cards */}
      {alternatives.map((alternative, index) => (
        <TouchableOpacity
          key={`${alternative.upc}-${index}`}
          style={[
            styles.alternativeCard,
            alternative.inStockNearby && styles.alternativeCardInStock
          ]}
          onPress={() => onAlternativePress?.(alternative)}
          disabled={!onAlternativePress}
          accessibilityLabel={`${alternative.brand} ${alternative.productName}, ${alternative.form}${alternative.inStockNearby ? ', ' + t('a11y.formulaAlternatives.inStockLabel') : ''}${alternative.stateContractBrand ? ', ' + t('a11y.formulaAlternatives.contractLabel') : ''}`}
          {...(onAlternativePress ? { accessibilityRole: 'button' as const, accessibilityHint: t('a11y.formulaAlternatives.cardHint') } : {})}
        >
          {/* Priority Badges */}
          <View style={styles.badgeRow}>
            {alternative.inStockNearby && (
              <View style={[styles.badge, styles.badgeInStock]}>
                <Text style={styles.badgeText}>✓ {t('alternatives.inStockNearby')}</Text>
              </View>
            )}
            {alternative.stateContractBrand && (
              <View style={[styles.badge, styles.badgeContract]}>
                <Text style={styles.badgeText}>{t('alternatives.wicContractBrand')}</Text>
              </View>
            )}
          </View>

          {/* Formula Info */}
          <Text style={styles.brandText}>{alternative.brand}</Text>
          <Text style={styles.productNameText}>{alternative.productName}</Text>

          <View style={styles.detailsRow}>
            <Text style={styles.detailText}>
              {alternative.form} • {alternative.size || t('alternatives.sizeNotSpecified')}
            </Text>
          </View>

          {/* Reason */}
          <View style={styles.reasonContainer}>
            <Text style={styles.reasonLabel}>{t('alternatives.whySuggested')}</Text>
            <Text style={styles.reasonText}>{alternative.reason}</Text>
          </View>

          {/* Additional Notes */}
          {alternative.notes && (
            <View style={styles.notesContainer}>
              <Text style={styles.notesText}>{alternative.notes}</Text>
            </View>
          )}

          {/* Availability Info */}
          {showAvailability && alternative.availability && alternative.availability.length > 0 && (
            <View style={styles.availabilitySection}>
              <Text style={styles.availabilityHeader}>
                {t('alternatives.availableAt')}
              </Text>
              {alternative.availability.slice(0, 2).map((avail, idx) => (
                <View key={idx} style={styles.availabilityRow}>
                  <View style={styles.availabilityLeft}>
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: getStatusColor(avail.status) }
                      ]}
                      accessible={false}
                    />
                    <Text style={styles.storeNameText} numberOfLines={1}>
                      {avail.storeName}
                    </Text>
                  </View>
                  <View style={styles.availabilityRight}>
                    {avail.distanceMiles && (
                      <Text style={styles.distanceText}>
                        {avail.distanceMiles} {t('result.miles')}
                      </Text>
                    )}
                    <Text style={styles.statusText}>
                      {getStatusLabel(avail.status)}
                    </Text>
                  </View>
                </View>
              ))}
              {alternative.availability.length > 2 && (
                <Text style={styles.moreLocationsText}>
                  {t('alternatives.moreLocations', {
                    count: alternative.availability.length - 2
                  })}
                </Text>
              )}
            </View>
          )}

          {/* Tap indicator */}
          {onAlternativePress && (
            <View style={styles.tapIndicator}>
              <Text style={styles.tapIndicatorText}>
                {t('alternatives.tapForDetails')} →
              </Text>
            </View>
          )}
        </TouchableOpacity>
      ))}

      {/* Footer Note */}
      <View style={styles.footerNote}>
        <Text style={styles.footerNoteText}>
          {t('alternatives.footerNote')}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  disclaimerCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF3E0',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  disclaimerIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  disclaimerTextContainer: {
    flex: 1,
  },
  disclaimerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E65100',
    marginBottom: 4,
  },
  disclaimerText: {
    fontSize: 13,
    color: '#E65100',
    lineHeight: 18,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  alternativeCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  alternativeCardInStock: {
    borderColor: '#4CAF50',
    backgroundColor: '#F1F8F4',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeInStock: {
    backgroundColor: '#4CAF50',
  },
  badgeContract: {
    backgroundColor: '#1976D2',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    textTransform: 'uppercase',
  },
  brandText: {
    fontSize: 12,
    color: '#666',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  productNameText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailText: {
    fontSize: 13,
    color: '#666',
  },
  reasonContainer: {
    backgroundColor: '#F5F5F5',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  reasonLabel: {
    fontSize: 11,
    color: '#666',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  reasonText: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
  },
  notesContainer: {
    backgroundColor: '#E3F2FD',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  notesText: {
    fontSize: 12,
    color: '#1565C0',
    fontStyle: 'italic',
  },
  availabilitySection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  availabilityHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  availabilityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  availabilityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  availabilityRight: {
    alignItems: 'flex-end',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  storeNameText: {
    fontSize: 13,
    color: '#333',
    flex: 1,
  },
  distanceText: {
    fontSize: 11,
    color: '#666',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
  },
  moreLocationsText: {
    fontSize: 12,
    color: '#1976D2',
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
  },
  tapIndicator: {
    marginTop: 8,
    alignItems: 'flex-end',
  },
  tapIndicatorText: {
    fontSize: 13,
    color: '#1976D2',
    fontWeight: '600',
  },
  footerNote: {
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 20,
  },
  footerNoteText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
  },
});
