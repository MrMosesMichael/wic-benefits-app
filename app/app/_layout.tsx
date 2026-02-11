import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { I18nProvider, useI18n } from '@/lib/i18n/I18nContext';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import notificationService from '@/lib/services/notificationService';
import * as Notifications from 'expo-notifications';

function Navigation() {
  const { t } = useI18n();
  const router = useRouter();

  // Set up notification listeners on mount
  useEffect(() => {
    // Handle notification tapped - navigate to formula finder
    const handleNotificationTapped = (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data;

      if (data.type === 'formula_restock') {
        // Navigate to formula finder
        router.push('/formula');
      } else if (data.type === 'subscription_expiration') {
        // Navigate to formula finder to manage alerts
        router.push('/formula');
      }
    };

    // Set up listeners
    notificationService.setupNotificationListeners(
      undefined, // onReceived - let default handler show notification
      handleNotificationTapped
    );

    // Check if app was opened from a notification
    notificationService.getLastNotificationResponse().then((response) => {
      if (response) {
        handleNotificationTapped(response);
      }
    });

    // Cleanup on unmount
    return () => {
      notificationService.removeNotificationListeners();
    };
  }, []);

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#2E7D32',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerRight: () => <LanguageSwitcher compact />,
      }}
    >
      <Stack.Screen name="index" options={{ title: t('nav.home') }} />
      <Stack.Screen
        name="scanner/index"
        options={{
          title: t('nav.scanner'),
          headerShown: false, // Hide header for fullscreen camera
        }}
      />
      <Stack.Screen
        name="scanner/result"
        options={{ title: t('nav.scanResult') }}
      />
      <Stack.Screen name="benefits/index" options={{ title: t('nav.benefits') }} />
      <Stack.Screen name="benefits/household-setup" options={{ title: t('benefits.setupHousehold') }} />
      <Stack.Screen name="benefits/manual-entry" options={{ title: t('benefits.addManually') }} />
      <Stack.Screen name="benefits/period-settings" options={{ title: t('benefits.managePeriod') }} />
      <Stack.Screen name="cart/index" options={{ title: t('nav.cart') }} />
      <Stack.Screen name="formula/index" options={{ title: t('nav.formula') }} />
      <Stack.Screen name="formula/cross-store-search" options={{ title: t('nav.crossStoreSearch') }} />
      <Stack.Screen name="formula/select" options={{ title: t('nav.selectFormula') }} />
      <Stack.Screen name="formula/alternatives" options={{ title: 'Formula Alternatives' }} />
      <Stack.Screen name="formula/report" options={{ title: t('nav.reportFormula') }} />
      <Stack.Screen name="formula/alerts" options={{ title: t('nav.formulaAlerts') }} />
      <Stack.Screen name="foodbanks/index" options={{ title: t('nav.foodBanks') }} />
      <Stack.Screen name="settings/privacy" options={{ title: t('nav.privacy') }} />
      <Stack.Screen name="settings/location" options={{ title: 'Location' }} />
      <Stack.Screen name="help/index" options={{ title: t('nav.help') }} />
      <Stack.Screen name="feedback/index" options={{ title: t('nav.feedback') }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <I18nProvider>
      <Navigation />
    </I18nProvider>
  );
}
