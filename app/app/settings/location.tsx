import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useLocation } from '@/lib/hooks/useLocation';
import { useTranslation } from '@/lib/i18n/I18nContext';
import { SUPPORTED_STATES, setLocationPreference, getLocationPreference, LocationPreference } from '@/lib/services/locationService';
import { useEffect } from 'react';

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
      setZipError('Please enter a valid 5-digit zip code');
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

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Current Location */}
        {location && (
          <View style={styles.card}>
            <Text style={styles.cardTitle} accessibilityRole="header">Current Location</Text>
            <View style={styles.locationInfo}>
              <Text style={styles.locationCity}>
                {location.city ? `${location.city}, ` : ''}{location.state}
              </Text>
              {location.zipCode && (
                <Text style={styles.locationDetail}>Zip: {location.zipCode}</Text>
              )}
              <Text style={styles.locationDetail}>
                Source: {location.source === 'gps' ? 'GPS' : 'Zip Code'}
              </Text>
            </View>

            {!stateSupported && (
              <View style={styles.unsupportedBanner}>
                <Text style={styles.unsupportedText}>
                  WIC data not yet available for {location.state}. Currently supporting {SUPPORTED_STATES.join(', ')}.
                </Text>
              </View>
            )}

            <TouchableOpacity style={styles.clearButton} onPress={handleClear} accessibilityRole="button" accessibilityLabel={t('a11y.location.clearLabel')} hitSlop={{ top: 4, bottom: 4 }}>
              <Text style={styles.clearButtonText}>Clear Location</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* GPS Button */}
        <View style={styles.card}>
          <Text style={styles.cardTitle} accessibilityRole="header">Use GPS</Text>
          <Text style={styles.cardDescription}>
            Automatically detect your location and state.
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
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>Detect My Location</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Zip Code Entry */}
        <View style={styles.card}>
          <Text style={styles.cardTitle} accessibilityRole="header">Enter Zip Code</Text>
          <Text style={styles.cardDescription}>
            Works without GPS permission. Enter your 5-digit zip code.
          </Text>
          <View style={styles.zipRow}>
            <TextInput
              style={[styles.zipInput, zipError && styles.zipInputError]}
              value={zipInput}
              onChangeText={(text) => {
                setZipInput(text.replace(/\D/g, '').slice(0, 5));
                setZipError(null);
              }}
              placeholder="e.g. 48201"
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
              <Text style={styles.zipButtonText}>Set</Text>
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
          <Text style={styles.cardTitle} accessibilityRole="header">Default Behavior</Text>
          <Text style={styles.cardDescription}>
            How should location be determined when you open the app?
          </Text>
          {(['gps', 'manual', 'ask'] as LocationPreference[]).map((pref) => (
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
                  {pref === 'gps' ? 'Always use GPS' : pref === 'manual' ? 'Always use zip code' : 'Ask each time'}
                </Text>
                <Text style={styles.prefDescription}>
                  {pref === 'gps'
                    ? 'Automatically detect location via GPS'
                    : pref === 'manual'
                    ? 'Use your saved zip code'
                    : 'Choose GPS or zip code each session'}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle} accessibilityRole="header">Why Location Matters</Text>
          <Text style={styles.infoText}>
            WIC-approved products vary by state. Your location helps us show the right product list, find nearby stores, and locate food banks in your area.
          </Text>
          <Text style={[styles.infoText, { marginTop: 8 }]}>
            Currently supporting: {SUPPORTED_STATES.join(', ')}
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2E7D32',
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
    padding: 16,
  },
  card: {
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
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  locationInfo: {
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  locationCity: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  locationDetail: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  unsupportedBanner: {
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F57C00',
  },
  unsupportedText: {
    fontSize: 13,
    color: '#E65100',
    lineHeight: 18,
  },
  clearButton: {
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
  },
  clearButtonText: {
    color: '#999',
    fontSize: 14,
  },
  primaryButton: {
    backgroundColor: '#2E7D32',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
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
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    letterSpacing: 4,
    textAlign: 'center',
  },
  zipInputError: {
    borderColor: '#C62828',
  },
  zipButton: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 24,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zipButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: '#C62828',
    fontSize: 13,
    marginTop: 4,
  },
  errorBanner: {
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#C62828',
  },
  errorBannerText: {
    color: '#C62828',
    fontSize: 14,
  },
  prefOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  prefOptionActive: {
    // no special styling needed
  },
  prefRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CCC',
    marginRight: 12,
  },
  prefRadioActive: {
    borderColor: '#2E7D32',
    backgroundColor: '#2E7D32',
  },
  prefTextContainer: {
    flex: 1,
  },
  prefLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  prefLabelActive: {
    color: '#2E7D32',
  },
  prefDescription: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  infoCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});
