import { Stack } from 'expo-router';
import { I18nProvider, useI18n } from '@/lib/i18n/I18nContext';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

function Navigation() {
  const { t } = useI18n();

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
      <Stack.Screen name="help/index" options={{ title: t('nav.help') }} />
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
