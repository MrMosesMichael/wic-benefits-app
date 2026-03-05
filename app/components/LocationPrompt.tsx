/**
 * LocationPrompt — Shown when no location is available
 *
 * Provides two options: Use GPS or Enter Zip Code.
 * Used by all location-dependent screens as a fallback.
 */
import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from '@/lib/i18n/I18nContext';
import { colors } from '@/lib/theme';

interface LocationPromptProps {
  onGPS: () => Promise<void>;
  onZipCode: (zip: string) => Promise<void>;
  loading: boolean;
  error: string | null;
}

export default function LocationPrompt({ onGPS, onZipCode, loading, error }: LocationPromptProps) {
  const t = useTranslation();
  const [showZipInput, setShowZipInput] = useState(false);
  const [zipInput, setZipInput] = useState('');

  const handleSubmitZip = () => {
    const zip = zipInput.trim();
    if (/^\d{5}$/.test(zip)) {
      onZipCode(zip);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.icon} accessible={false} importantForAccessibility="no">📍</Text>
      <Text style={styles.title}>{t('locationPrompt.title')}</Text>
      <Text style={styles.description}>
        {t('locationPrompt.description')}
      </Text>

      {error && (
        <View style={styles.errorBanner} accessibilityRole="alert" accessibilityLiveRegion="assertive">
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.header} />
          <Text style={styles.loadingText}>{t('locationPrompt.detecting')}</Text>
        </View>
      ) : showZipInput ? (
        <View style={styles.zipContainer}>
          <Text style={styles.zipLabel}>{t('locationPrompt.enterZipLabel')}</Text>
          <View style={styles.zipRow}>
            <TextInput
              style={styles.zipInput}
              value={zipInput}
              onChangeText={(text) => setZipInput(text.replace(/\D/g, '').slice(0, 5))}
              placeholder={t('locationPrompt.placeholder')}
              keyboardType="number-pad"
              maxLength={5}
              autoFocus
              accessibilityLabel={t('a11y.locationPrompt.zipInputLabel')}
              accessibilityHint={t('a11y.locationPrompt.zipInputHint')}
            />
            <TouchableOpacity
              style={[styles.zipSubmit, zipInput.length !== 5 && styles.disabled]}
              onPress={handleSubmitZip}
              disabled={zipInput.length !== 5}
              accessibilityRole="button"
              accessibilityLabel={t('a11y.locationPrompt.submitZipLabel')}
              accessibilityState={{ disabled: zipInput.length !== 5 }}
            >
              <Text style={styles.zipSubmitText}>{t('locationPrompt.go')}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            onPress={() => setShowZipInput(false)}
            accessibilityRole="link"
            accessibilityLabel={t('a11y.locationPrompt.switchToGpsLabel')}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.switchLink}>{t('locationPrompt.useGpsInstead')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.buttons}>
          <TouchableOpacity
            style={styles.gpsButton}
            onPress={onGPS}
            accessibilityRole="button"
            accessibilityLabel={t('a11y.locationPrompt.gpsLabel')}
            accessibilityHint={t('a11y.locationPrompt.gpsHint')}
          >
            <Text style={styles.gpsButtonText}>{t('locationPrompt.useGps')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.zipButton}
            onPress={() => setShowZipInput(true)}
            accessibilityRole="button"
            accessibilityLabel={t('a11y.locationPrompt.zipLabel')}
            accessibilityHint={t('a11y.locationPrompt.zipHint')}
          >
            <Text style={styles.zipButtonText}>{t('locationPrompt.enterZipCode')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 32,
    alignItems: 'center',
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.navy,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  errorBanner: {
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    width: '100%',
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: colors.muted,
    fontSize: 14,
  },
  buttons: {
    width: '100%',
    gap: 12,
  },
  gpsButton: {
    backgroundColor: colors.header,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  gpsButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  zipButton: {
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.header,
  },
  zipButtonText: {
    color: colors.header,
    fontSize: 16,
    fontWeight: '600',
  },
  zipContainer: {
    width: '100%',
  },
  zipLabel: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: 8,
  },
  zipRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
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
  zipSubmit: {
    backgroundColor: colors.header,
    paddingHorizontal: 24,
    borderRadius: 8,
    justifyContent: 'center',
  },
  zipSubmitText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
  switchLink: {
    color: colors.header,
    fontSize: 14,
    textAlign: 'center',
  },
});
