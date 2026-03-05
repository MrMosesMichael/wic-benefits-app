import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useLocation } from '@/lib/hooks/useLocation';
import { useTranslation } from '@/lib/i18n/I18nContext';
import { SUPPORTED_STATES, setLocationPreference, getLocationPreference, LocationPreference } from '@/lib/services/locationService';
import { useEffect } from 'react';
import { colors, fonts, card } from '@/lib/theme';

export default function LocationSettingsScreen() {
  const router = useRouter();
  const t = useTranslation();
  const { location, loading, error, refresh, setZipCode, clear } = useLocation();
  const [zipInput, setZipInput] = useState('');
  const [zipError, setZipError] = useState<string | null>(null);
  const [preference, setPreference] = useState<LocationPreference>('ask');

  useEffect(() => {
    getLocationPreference().then(setPreference);
  }, []);

  const handleUseGPS = async () => {
    await refresh();
    await setLocationPreference('gps');
    setPreference('gps');
  };

  const handleSubmitZip = async () => {
    const zip = zipInput.trim();
    if (!/^\d{5}$/.test(zip)) {
      setZipError(t('locationSettings.invalidZip'));
      return;
    }
    setZipError(null);
    await setZipCode(zip);
  };

  const handleClear = async () => {
    await clear();
    setZipInput('');
    setZipError(null);
  };

  const handleSetPreference = async (pref: LocationPreference) => {
    await setLocationPreference(pref);
    setPreference(pref);
  };

  const stateSupported = location ? SUPPORTED_STATES.includes(location.state) : true;

  const prefOptions: { value: LocationPreference; labelKey: string; descKey: string }[] = [
    { value: 'gps', labelKey: 'locationSettings.alwaysGps', descKey: 'locationSettings.alwaysGpsDesc' },
    { value: 'manual', labelKey: 'locationSettings.alwaysZip', descKey: 'locationSettings.alwaysZipDesc' },
    { value: 'ask', labelKey: 'locationSettings.askEachTime', descKey: 'locationSettings.askEachTimeDesc' },
  ];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={80}
    >
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Current Location */}
        {location && (
          <View style={styles.card}>
            <Text style={styles.cardTitle} accessibilityRole="header">{t('locationSettings.currentLocation')}</Text>
            <View style={styles.locationInfo}>
              <Text style={styles.locationCity}>
                {location.city ? `${location.city}, ` : ''}{location.state}
              </Text>
              {location.zipCode && (
                <Text style={styles.locationDetail}>{t('locationSettings.zip')} {location.zipCode}</Text>
              )}
              <Text style={styles.locationDetail}>
                {t('locationSettings.source')} {location.source === 'gps' ? t('locationSettings.sourceGps') : t('locationSettings.sourceZip')}
              </Text>
            </View>

            {!stateSupported && (
              <View style={styles.unsupportedBanner}>
                <Text style={styles.unsupportedText}>
                  {t('locationSettings.unsupportedState', { state: location.state, states: SUPPORTED_STATES.join(', ') })}
                </Text>
              </View>
            )}

            <TouchableOpacity style={styles.clearButton} onPress={handleClear} accessibilityRole="button" accessibilityLabel={t('a11y.location.clearLabel')} hitSlop={{ top: 4, bottom: 4 }}>
              <Text style={styles.clearButtonText}>{t('locationSettings.clearLocation')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* GPS Button */}
        <View style={styles.card}>
          <Text style={styles.cardTitle} accessibilityRole="header">{t('locationSettings.useGps')}</Text>
          <Text style={styles.cardDescription}>
            {t('locationSettings.useGpsDesc')}
          </Text>
          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleUseGPS}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel={t('a11y.location.detectGpsLabel')}
            accessibilityState={{ disabled: loading }}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>{t('locationSettings.detectMyLocation')}</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Zip Code Entry */}
        <View style={styles.card}>
          <Text style={styles.cardTitle} accessibilityRole="header">{t('locationSettings.enterZipCode')}</Text>
          <Text style={styles.cardDescription}>
            {t('locationSettings.enterZipDesc')}
          </Text>
          <View style={styles.zipRow}>
            <TextInput
              style={[styles.zipInput, zipError && styles.zipInputError]}
              value={zipInput}
              onChangeText={(text) => {
                setZipInput(text.replace(/\D/g, '').slice(0, 5));
                setZipError(null);
              }}
              placeholder={t('locationSettings.placeholder')}
              keyboardType="number-pad"
              maxLength={5}
              accessibilityLabel={t('a11y.location.zipInputLabel')}
            />
            <TouchableOpacity
              style={[styles.zipButton, (loading || zipInput.length !== 5) && styles.buttonDisabled]}
              onPress={handleSubmitZip}
              disabled={loading || zipInput.length !== 5}
              accessibilityRole="button"
              accessibilityLabel={t('a11y.location.setZipLabel')}
              accessibilityState={{ disabled: loading || zipInput.length !== 5 }}
            >
              <Text style={styles.zipButtonText}>{t('locationSettings.set')}</Text>
            </TouchableOpacity>
          </View>
          {zipError && <Text style={styles.errorText}>{zipError}</Text>}
        </View>

        {/* Error Display */}
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        )}

        {/* Preference */}
        <View style={styles.card}>
          <Text style={styles.cardTitle} accessibilityRole="header">{t('locationSettings.defaultBehavior')}</Text>
          <Text style={styles.cardDescription}>
            {t('locationSettings.defaultBehaviorDesc')}
          </Text>
          {prefOptions.map(({ value: pref, labelKey, descKey }) => (
            <TouchableOpacity
              key={pref}
              style={[styles.prefOption, preference === pref && styles.prefOptionActive]}
              onPress={() => handleSetPreference(pref)}
              accessibilityRole="radio"
              accessibilityLabel={pref === 'gps' ? t('a11y.location.prefGpsLabel') : pref === 'manual' ? t('a11y.location.prefManualLabel') : t('a11y.location.prefAskLabel')}
              accessibilityState={{ selected: preference === pref }}
            >
              <View style={[styles.prefRadio, preference === pref && styles.prefRadioActive]} />
              <View style={styles.prefTextContainer}>
                <Text style={[styles.prefLabel, preference === pref && styles.prefLabelActive]}>
                  {t(labelKey)}
                </Text>
                <Text style={styles.prefDescription}>
                  {t(descKey)}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle} accessibilityRole="header">{t('locationSettings.whyLocationMatters')}</Text>
          <Text style={styles.infoText}>
            {t('locationSettings.whyLocationDesc')}
          </Text>
          <Text style={[styles.infoText, { marginTop: 8 }]}>
            {t('locationSettings.currentlySupporting')} {SUPPORTED_STATES.join(', ')}
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </View>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.screenBg,
  },
  header: {
    backgroundColor: colors.header,
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
    color: colors.white,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  content: {
    padding: 16,
  },
  card: {
    ...card,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.navy,
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: 12,
    lineHeight: 20,
  },
  locationInfo: {
    backgroundColor: colors.screenBg,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  locationCity: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.success,
  },
  locationDetail: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
  unsupportedBanner: {
    backgroundColor: colors.cardBg,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  unsupportedText: {
    fontSize: 13,
    color: colors.warning,
    lineHeight: 18,
  },
  clearButton: {
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
  },
  clearButtonText: {
    color: colors.muted,
    fontSize: 14,
  },
  primaryButton: {
    backgroundColor: colors.header,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  zipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  zipInput: {
    flex: 1,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    letterSpacing: 4,
    textAlign: 'center',
  },
  zipInputError: {
    borderColor: colors.danger,
  },
  zipButton: {
    backgroundColor: colors.header,
    paddingHorizontal: 24,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zipButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    marginTop: 4,
  },
  errorBanner: {
    backgroundColor: colors.screenBg,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.danger,
  },
  errorBannerText: {
    color: colors.danger,
    fontSize: 14,
  },
  prefOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  prefOptionActive: {
    // no special styling needed
  },
  prefRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    marginRight: 12,
  },
  prefRadioActive: {
    borderColor: colors.header,
    backgroundColor: colors.header,
  },
  prefTextContainer: {
    flex: 1,
  },
  prefLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.navy,
  },
  prefLabelActive: {
    color: colors.header,
  },
  prefDescription: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
  infoCard: {
    backgroundColor: colors.cardBg,
    padding: 16,
    borderRadius: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.navy,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: colors.muted,
    lineHeight: 20,
  },
});
