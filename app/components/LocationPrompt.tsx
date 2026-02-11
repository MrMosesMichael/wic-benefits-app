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

interface LocationPromptProps {
  onGPS: () => Promise<void>;
  onZipCode: (zip: string) => Promise<void>;
  loading: boolean;
  error: string | null;
}

export default function LocationPrompt({ onGPS, onZipCode, loading, error }: LocationPromptProps) {
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
      <Text style={styles.icon}>📍</Text>
      <Text style={styles.title}>Location Needed</Text>
      <Text style={styles.description}>
        We need your location to show relevant WIC data and find nearby stores.
      </Text>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2E7D32" />
          <Text style={styles.loadingText}>Detecting location...</Text>
        </View>
      ) : showZipInput ? (
        <View style={styles.zipContainer}>
          <Text style={styles.zipLabel}>Enter your 5-digit zip code:</Text>
          <View style={styles.zipRow}>
            <TextInput
              style={styles.zipInput}
              value={zipInput}
              onChangeText={(text) => setZipInput(text.replace(/\D/g, '').slice(0, 5))}
              placeholder="e.g. 48201"
              keyboardType="number-pad"
              maxLength={5}
              autoFocus
            />
            <TouchableOpacity
              style={[styles.zipSubmit, zipInput.length !== 5 && styles.disabled]}
              onPress={handleSubmitZip}
              disabled={zipInput.length !== 5}
            >
              <Text style={styles.zipSubmitText}>Go</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => setShowZipInput(false)}>
            <Text style={styles.switchLink}>Use GPS instead</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.buttons}>
          <TouchableOpacity style={styles.gpsButton} onPress={onGPS}>
            <Text style={styles.gpsButtonText}>Use GPS</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.zipButton} onPress={() => setShowZipInput(true)}>
            <Text style={styles.zipButtonText}>Enter Zip Code</Text>
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
    color: '#333',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#666',
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
    color: '#C62828',
    fontSize: 14,
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 14,
  },
  buttons: {
    width: '100%',
    gap: 12,
  },
  gpsButton: {
    backgroundColor: '#2E7D32',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  gpsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  zipButton: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2E7D32',
  },
  zipButtonText: {
    color: '#2E7D32',
    fontSize: 16,
    fontWeight: '600',
  },
  zipContainer: {
    width: '100%',
  },
  zipLabel: {
    fontSize: 14,
    color: '#666',
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
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    letterSpacing: 4,
    textAlign: 'center',
  },
  zipSubmit: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 24,
    borderRadius: 8,
    justifyContent: 'center',
  },
  zipSubmitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
  switchLink: {
    color: '#2E7D32',
    fontSize: 14,
    textAlign: 'center',
  },
});
