import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { getBenefits, Household } from '@/lib/services/api';
import { useTranslation } from '@/lib/i18n/I18nContext';
import NeedHelpLink from '@/components/NeedHelpLink';

export default function Benefits() {
  const router = useRouter();
  const t = useTranslation();
  const [household, setHousehold] = useState<Household | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reload benefits when screen comes into focus (e.g., returning from household setup)
  useFocusEffect(
    useCallback(() => {
      loadBenefits();
    }, [])
  );

  const loadBenefits = async () => {
    try {
      setError(null);
      const data = await getBenefits();
      setHousehold(data);
    } catch (err) {
      console.error('Failed to load benefits:', err);
      setError('Failed to load benefits. Please check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadBenefits();
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={styles.loadingText}>{t('benefits.loading')}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{t('benefits.failedToLoad')}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadBenefits} accessibilityRole="button">
          <Text style={styles.retryButtonText}>{t('benefits.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!household || household.participants.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyTitle}>{t('benefits.noBenefitsTitle')}</Text>
        <Text style={styles.emptyText}>
          {t('benefits.noBenefitsMessage')}
        </Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push('/benefits/household-setup')}
          accessibilityRole="button"
        >
          <Text style={styles.primaryButtonText}>{t('benefits.setupHousehold')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>{t('result.backToHome')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.headerTop}>
        <TouchableOpacity
          style={styles.setupButton}
          onPress={() => router.push('/benefits/household-setup')}
          accessibilityRole="button"
          accessibilityHint={t('a11y.benefits.setupHint')}
          hitSlop={{ top: 6, bottom: 6 }}
        >
          <Text style={styles.setupButtonText}>{t('benefits.setup')}</Text>
        </TouchableOpacity>
      </View>

      {household.participants.map((participant) => (
        <View key={participant.id} style={styles.participantSection}>
          <View style={styles.participantHeader}>
            <Text style={styles.participantName} accessibilityRole="header">{participant.name}</Text>
            <View style={styles.typeBadge}>
              <Text style={styles.typeText}>{participant.type}</Text>
            </View>
          </View>

          <View style={styles.benefitsList}>
            {participant.benefits.length === 0 ? (
              <Text style={styles.noBenefitsText}>{t('benefits.noActiveBenefits')}</Text>
            ) : (
              participant.benefits.map((benefit, index) => {
                const consumed = parseFloat(benefit.consumed);
                const inCart = parseFloat(benefit.inCart);
                const available = parseFloat(benefit.available);
                const total = parseFloat(benefit.total);

                return (
                  <View
                    key={index}
                    style={styles.benefitCard}
                    accessible={true}
                    accessibilityLabel={t('a11y.benefits.benefitLabel', { category: benefit.categoryLabel, available: benefit.available, unit: benefit.unit, inCart: benefit.inCart, consumed: benefit.consumed, total: benefit.total })}
                  >
                    <Text style={styles.categoryName}>{benefit.categoryLabel}</Text>

                    {/* Three-state progress bar */}
                    <View style={styles.progressBarContainer}>
                      <View style={styles.progressBar}>
                        {consumed > 0 && (
                          <View style={[styles.progressSegment, styles.consumedSegment, { flex: consumed }]} />
                        )}
                        {inCart > 0 && (
                          <View style={[styles.progressSegment, styles.inCartSegment, { flex: inCart }]} />
                        )}
                        {available > 0 && (
                          <View style={[styles.progressSegment, styles.availableSegment, { flex: available }]} />
                        )}
                      </View>
                    </View>

                    {/* State labels */}
                    <View style={styles.stateLabels}>
                      <View style={styles.stateLabel}>
                        <View style={[styles.stateDot, styles.consumedDot]} />
                        <Text style={styles.stateLabelText}>{t('benefits.used')}: {benefit.consumed} {benefit.unit}</Text>
                      </View>
                      <View style={styles.stateLabel}>
                        <View style={[styles.stateDot, styles.inCartDot]} />
                        <Text style={styles.stateLabelText}>{t('benefits.inCart')}: {benefit.inCart} {benefit.unit}</Text>
                      </View>
                      <View style={styles.stateLabel}>
                        <View style={[styles.stateDot, styles.availableDot]} />
                        <Text style={styles.stateLabelText}>{t('benefits.available')}: {benefit.available} {benefit.unit}</Text>
                      </View>
                    </View>

                    <Text style={styles.total}>
                      {t('benefits.total')}: {benefit.total} {benefit.unit}
                    </Text>

                    {benefit.periodEnd && (
                      <Text style={styles.expiration}>
                        {t('benefits.expires')}: {new Date(benefit.periodEnd).toLocaleDateString()}
                      </Text>
                    )}
                  </View>
                );
              })
            )}
          </View>
        </View>
      ))}

      <View style={styles.notice} accessibilityLabel={t('benefits.notice')}>
        <Text style={styles.noticeText}>
          💡 {t('benefits.notice')}
        </Text>
      </View>

      <View style={styles.helpLinkContainer}>
        <NeedHelpLink 
          variant="card"
          faqId="benefit-states"
          contextHint={t('help.understandBenefits')}
        />
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.periodButton}
          onPress={() => router.push('/benefits/period-settings')}
          accessibilityRole="button"
        >
          <Text style={styles.periodButtonText}>{t('benefits.managePeriod')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.addBenefitButton}
          onPress={() => router.push('/benefits/manual-entry')}
          accessibilityRole="button"
        >
          <Text style={styles.addBenefitButtonText}>{t('benefits.addManually')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.scanButton}
          onPress={() => router.push('/scanner')}
          accessibilityRole="button"
          accessibilityHint={t('a11y.benefits.scanHint')}
        >
          <Text style={styles.scanButtonText}>{t('benefits.scanProducts')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => router.back()}
          accessibilityRole="button"
        >
          <Text style={styles.homeButtonText}>{t('result.backToHome')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  setupButton: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  setupButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#C62828',
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  participantSection: {
    marginTop: 16,
  },
  participantHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  participantName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  typeBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1976D2',
    textTransform: 'capitalize',
  },
  benefitsList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  noBenefitsText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  benefitCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2E7D32',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  progressBarContainer: {
    marginVertical: 12,
  },
  progressBar: {
    flexDirection: 'row',
    height: 24,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#E0E0E0',
  },
  progressSegment: {
    height: '100%',
  },
  consumedSegment: {
    backgroundColor: '#9E9E9E',
  },
  inCartSegment: {
    backgroundColor: '#FFA000',
  },
  availableSegment: {
    backgroundColor: '#2E7D32',
  },
  stateLabels: {
    marginTop: 8,
    gap: 4,
  },
  stateLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stateDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  consumedDot: {
    backgroundColor: '#9E9E9E',
  },
  inCartDot: {
    backgroundColor: '#FFA000',
  },
  availableDot: {
    backgroundColor: '#2E7D32',
  },
  stateLabelText: {
    fontSize: 12,
    color: '#666',
  },
  amounts: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 4,
  },
  available: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  total: {
    fontSize: 13,
    color: '#666',
    marginTop: 8,
  },
  expiration: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  notice: {
    margin: 16,
    padding: 12,
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFECB5',
  },
  noticeText: {
    fontSize: 12,
    color: '#856404',
    lineHeight: 18,
  },
  helpLinkContainer: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  buttonContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 12,
  },
  periodButton: {
    backgroundColor: '#7B1FA2',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  periodButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  addBenefitButton: {
    backgroundColor: '#1565C0',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  addBenefitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  scanButton: {
    backgroundColor: '#2E7D32',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  homeButton: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  homeButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#2E7D32',
    padding: 16,
    borderRadius: 8,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  retryButton: {
    backgroundColor: '#2E7D32',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
    minWidth: 200,
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
