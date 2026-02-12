import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import notificationService, { type NotificationSubscription } from '@/lib/services/notificationService';
import { useTranslation } from '@/lib/i18n/I18nContext';
import Constants from 'expo-constants';

// Demo user ID - would come from auth in production
const USER_ID = Constants.expoConfig?.extra?.demoUserId || 'demo-user-001';

export default function FormulaAlertsScreen() {
  const router = useRouter();
  const t = useTranslation();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subscriptions, setSubscriptions] = useState<NotificationSubscription[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const loadSubscriptions = async () => {
    try {
      setError(null);
      const subs = await notificationService.getSubscriptions(USER_ID);
      setSubscriptions(subs);
    } catch (err) {
      console.error('Failed to load subscriptions:', err);
      setError(t('formulaAlertsList.loadError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadSubscriptions();
  }, []);

  const handleDelete = async (subscription: NotificationSubscription) => {
    Alert.alert(
      t('formulaAlerts.cancelAlert'),
      t('formulaAlerts.cancelAlertMessage', { formula: subscription.upc }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('formulaAlerts.cancelAlertConfirm'),
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await notificationService.unsubscribe(USER_ID, subscription.id);
              if (success) {
                setSubscriptions(prev => prev.filter(s => s.id !== subscription.id));
              } else {
                Alert.alert(t('common.error'), t('formulaAlerts.unsubscribeFailed'));
              }
            } catch (err) {
              console.error('Failed to delete subscription:', err);
              Alert.alert(t('common.error'), t('formulaAlerts.unsubscribeFailed'));
            }
          },
        },
      ]
    );
  };

  const handleRenew = async (subscription: NotificationSubscription) => {
    try {
      // Re-subscribe to renew the expiration
      const renewed = await notificationService.subscribeToFormula(
        USER_ID,
        subscription.upc,
        subscription.radius || undefined,
        subscription.storeIds.length > 0 ? subscription.storeIds : undefined
      );

      if (renewed) {
        setSubscriptions(prev =>
          prev.map(s => (s.id === subscription.id ? renewed : s))
        );
        Alert.alert(
          t('formulaAlertsList.renewed'),
          t('formulaAlertsList.renewedMessage')
        );
      }
    } catch (err) {
      console.error('Failed to renew subscription:', err);
      Alert.alert(t('common.error'), t('formulaAlertsList.renewError'));
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getDaysUntilExpiry = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getExpiryStatus = (expiresAt: string) => {
    const days = getDaysUntilExpiry(expiresAt);
    if (days <= 0) return { color: '#F44336', text: t('formulaAlertsList.expired') };
    if (days <= 3) return { color: '#FF9800', text: t('formulaAlertsList.expiresSoon', { days }) };
    if (days <= 7) return { color: '#FFC107', text: t('formulaAlertsList.expiresIn', { days }) };
    return { color: '#4CAF50', text: t('formulaAlertsList.active') };
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton} accessibilityRole="button" accessibilityLabel={t('a11y.alerts.goBackLabel')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.backButtonText}>{t('common.back')}</Text>
          </TouchableOpacity>
          <Text style={styles.title} accessibilityRole="header">{t('formulaAlertsList.title')}</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1976D2" />
          <Text style={styles.loadingText}>{t('formulaAlertsList.loading')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon} accessible={false} importantForAccessibility="no">⚠️</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadSubscriptions} accessibilityRole="button" accessibilityLabel={t('a11y.alerts.retryLabel')}>
              <Text style={styles.retryButtonText}>{t('common.tryAgain')}</Text>
            </TouchableOpacity>
          </View>
        ) : subscriptions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon} accessible={false} importantForAccessibility="no">🔔</Text>
            <Text style={styles.emptyTitle} accessibilityRole="header">{t('formulaAlertsList.noAlerts')}</Text>
            <Text style={styles.emptyText}>{t('formulaAlertsList.noAlertsMessage')}</Text>
            <TouchableOpacity
              style={styles.setupButton}
              onPress={() => router.push('/formula')}
              accessibilityRole="button"
              accessibilityLabel={t('a11y.alerts.setupLabel')}
              accessibilityHint={t('a11y.alerts.setupHint')}
            >
              <Text style={styles.setupButtonText}>{t('formulaAlertsList.setupAlert')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Info Card */}
            <View style={styles.infoCard}>
              <Text style={styles.infoIcon} accessible={false} importantForAccessibility="no">💡</Text>
              <Text style={styles.infoText}>
                {t('formulaAlertsList.infoText')}
              </Text>
            </View>

            {/* Subscription Cards */}
            {subscriptions.map((sub) => {
              const expiryStatus = getExpiryStatus(sub.expiresAt);
              const daysLeft = getDaysUntilExpiry(sub.expiresAt);

              return (
                <View key={sub.id} style={styles.subscriptionCard}>
                  {/* Header with status */}
                  <View style={styles.cardHeader}>
                    <View style={styles.upcBadge}>
                      <Text style={styles.upcBadgeText}>UPC: {sub.upc}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: expiryStatus.color }]}>
                      <Text style={styles.statusBadgeText}>{expiryStatus.text}</Text>
                    </View>
                  </View>

                  {/* Details */}
                  <View style={styles.cardDetails}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>{t('formulaAlertsList.radius')}:</Text>
                      <Text style={styles.detailValue}>
                        {sub.radius ? `${sub.radius} ${t('result.miles')}` : t('formulaAlertsList.anyDistance')}
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>{t('formulaAlertsList.stores')}:</Text>
                      <Text style={styles.detailValue}>
                        {sub.storeIds.length > 0
                          ? t('formulaAlertsList.specificStores', { count: sub.storeIds.length })
                          : t('formulaAlertsList.allStores')}
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>{t('formulaAlertsList.notifications')}:</Text>
                      <Text style={styles.detailValue}>{sub.notificationCount}</Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>{t('formulaAlertsList.expires')}:</Text>
                      <Text style={styles.detailValue}>{formatDate(sub.expiresAt)}</Text>
                    </View>
                  </View>

                  {/* Actions */}
                  <View style={styles.cardActions}>
                    {daysLeft <= 7 && (
                      <TouchableOpacity
                        style={styles.renewButton}
                        onPress={() => handleRenew(sub)}
                        accessibilityRole="button"
                        accessibilityLabel={t('a11y.alerts.renewLabel')}
                        hitSlop={{ top: 4, bottom: 4 }}
                      >
                        <Text style={styles.renewButtonText}>{t('formulaAlertsList.renew')}</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDelete(sub)}
                      accessibilityRole="button"
                      accessibilityLabel={t('a11y.alerts.deleteLabel')}
                      hitSlop={{ top: 4, bottom: 4 }}
                    >
                      <Text style={styles.deleteButtonText}>{t('formulaAlertsList.delete')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#1976D2',
    padding: 20,
    paddingTop: 60,
    paddingBottom: 24,
  },
  backButton: {
    marginBottom: 12,
  },
  backButtonText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    padding: 40,
    alignItems: 'center',
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#1976D2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  setupButton: {
    backgroundColor: '#1976D2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  setupButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  infoIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1565C0',
    lineHeight: 20,
  },
  subscriptionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  upcBadge: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  upcBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    fontFamily: 'monospace',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    textTransform: 'uppercase',
  },
  cardDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 12,
  },
  renewButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  renewButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#F44336',
    fontSize: 14,
    fontWeight: '600',
  },
});
