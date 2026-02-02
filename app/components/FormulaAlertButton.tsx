import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import notificationService, { type NotificationSubscription } from '@/lib/services/notificationService';
import { t } from '@/lib/i18n';
import Constants from 'expo-constants';

interface FormulaAlertButtonProps {
  userId: string;
  upc: string;
  formulaName: string;
  radius?: number;
  storeIds?: string[];
  onSubscriptionChange?: (subscription: NotificationSubscription | null) => void;
}

export default function FormulaAlertButton({
  userId,
  upc,
  formulaName,
  radius,
  storeIds,
  onSubscriptionChange,
}: FormulaAlertButtonProps) {
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [subscription, setSubscription] = useState<NotificationSubscription | null>(null);

  // Load subscription status on mount
  useEffect(() => {
    loadSubscription();
  }, [userId, upc]);

  const loadSubscription = async () => {
    setLoading(true);
    try {
      const sub = await notificationService.getSubscriptionForFormula(userId, upc);
      setSubscription(sub);
      onSubscriptionChange?.(sub);
    } catch (error) {
      console.error('Failed to load subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    setSubscribing(true);
    try {
      // Request permissions and register token
      const hasPermission = await notificationService.requestPermissions();

      if (!hasPermission) {
        Alert.alert(
          t('formulaAlerts.permissionRequired'),
          t('formulaAlerts.permissionMessage'),
          [{ text: t('common.ok') }]
        );
        setSubscribing(false);
        return;
      }

      // Create subscription
      const newSubscription = await notificationService.subscribeToFormula(
        userId,
        upc,
        radius,
        storeIds
      );

      if (newSubscription) {
        setSubscription(newSubscription);
        onSubscriptionChange?.(newSubscription);

        Alert.alert(
          t('formulaAlerts.alertSet'),
          t('formulaAlerts.alertSetMessage', { formula: formulaName }),
          [{ text: t('common.ok') }]
        );
      } else {
        Alert.alert(
          t('common.error'),
          t('formulaAlerts.subscriptionFailed'),
          [{ text: t('common.ok') }]
        );
      }
    } catch (error) {
      console.error('Failed to subscribe:', error);
      Alert.alert(
        t('common.error'),
        t('formulaAlerts.subscriptionFailed'),
        [{ text: t('common.ok') }]
      );
    } finally {
      setSubscribing(false);
    }
  };

  const handleUnsubscribe = async () => {
    if (!subscription) return;

    Alert.alert(
      t('formulaAlerts.cancelAlert'),
      t('formulaAlerts.cancelAlertMessage', { formula: formulaName }),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('formulaAlerts.cancelAlertConfirm'),
          style: 'destructive',
          onPress: async () => {
            setSubscribing(true);
            try {
              const success = await notificationService.unsubscribe(userId, subscription.id);

              if (success) {
                setSubscription(null);
                onSubscriptionChange?.(null);
              } else {
                Alert.alert(
                  t('common.error'),
                  t('formulaAlerts.unsubscribeFailed'),
                  [{ text: t('common.ok') }]
                );
              }
            } catch (error) {
              console.error('Failed to unsubscribe:', error);
              Alert.alert(
                t('common.error'),
                t('formulaAlerts.unsubscribeFailed'),
                [{ text: t('common.ok') }]
              );
            } finally {
              setSubscribing(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color="#2196F3" />
      </View>
    );
  }

  if (subscribing) {
    return (
      <TouchableOpacity style={[styles.button, styles.buttonLoading]} disabled>
        <ActivityIndicator size="small" color="#fff" />
        <Text style={styles.buttonText}>{t('formulaAlerts.loading')}</Text>
      </TouchableOpacity>
    );
  }

  if (subscription) {
    return (
      <TouchableOpacity
        style={[styles.button, styles.buttonActive]}
        onPress={handleUnsubscribe}
        activeOpacity={0.7}
      >
        <Text style={styles.buttonIcon}>🔔</Text>
        <Text style={styles.buttonText}>{t('formulaAlerts.alertActive')}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.button, styles.buttonInactive]}
      onPress={handleSubscribe}
      activeOpacity={0.7}
    >
      <Text style={styles.buttonIcon}>🔕</Text>
      <Text style={styles.buttonText}>{t('formulaAlerts.setAlert')}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 160,
    gap: 8,
  },
  buttonInactive: {
    backgroundColor: '#2196F3',
  },
  buttonActive: {
    backgroundColor: '#4CAF50',
  },
  buttonLoading: {
    backgroundColor: '#9E9E9E',
  },
  buttonIcon: {
    fontSize: 18,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
