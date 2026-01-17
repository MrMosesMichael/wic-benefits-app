import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Camera, useCameraDevice, useCodeScanner } from 'react-native-vision-camera';
import { checkCameraPermission, requestCameraPermission } from '@/lib/utils/permissions';
import { checkEligibility, EligibilityResult } from '@/lib/services/api';

export default function Scanner() {
  const router = useRouter();
  const [hasPermission, setHasPermission] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);

  const device = useCameraDevice('back');

  useEffect(() => {
    checkPermissions();
  }, []);

  useEffect(() => {
    // Reset scanning state when component mounts
    setIsActive(true);
    setLastScannedCode(null);
  }, []);

  const checkPermissions = async () => {
    const granted = await checkCameraPermission();
    if (granted) {
      setHasPermission(true);
    } else {
      const requested = await requestCameraPermission();
      setHasPermission(requested);
    }
  };

  const handleBarCodeScanned = async (codes: any[]) => {
    if (!isActive || scanning || codes.length === 0) return;

    const code = codes[0];
    const scannedValue = code.value;

    // Prevent duplicate scans
    if (scannedValue === lastScannedCode) return;

    setLastScannedCode(scannedValue);
    setScanning(true);
    setIsActive(false);

    try {
      console.log('Scanned UPC:', scannedValue);
      const result = await checkEligibility(scannedValue);

      // Navigate to result screen with data
      router.push({
        pathname: '/scanner/result',
        params: {
          upc: result.product.upc,
          name: result.product.name,
          brand: result.product.brand || '',
          eligible: result.eligible ? 'true' : 'false',
          category: result.category || '',
          reason: result.reason || '',
        },
      });
    } catch (error) {
      console.error('Error checking eligibility:', error);
      Alert.alert(
        'Error',
        'Failed to check product eligibility. Please try again.',
        [{ text: 'OK', onPress: () => setIsActive(true) }]
      );
    } finally {
      setScanning(false);
    }
  };

  const codeScanner = useCodeScanner({
    codeTypes: ['ean-13', 'upc-a', 'upc-e'],
    onCodeScanned: handleBarCodeScanned,
  });

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Camera permission is required</Text>
        <TouchableOpacity style={styles.button} onPress={checkPermissions}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Camera not available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isActive && !scanning}
        codeScanner={codeScanner}
      />

      {/* Scanning overlay */}
      <View style={styles.overlay}>
        <View style={styles.topOverlay} />
        <View style={styles.middleRow}>
          <View style={styles.sideOverlay} />
          <View style={styles.scanArea}>
            <View style={styles.corner} style={[styles.corner, styles.topLeft]} />
            <View style={styles.corner} style={[styles.corner, styles.topRight]} />
            <View style={styles.corner} style={[styles.corner, styles.bottomLeft]} />
            <View style={styles.corner} style={[styles.corner, styles.bottomRight]} />
          </View>
          <View style={styles.sideOverlay} />
        </View>
        <View style={styles.bottomOverlay}>
          <Text style={styles.instructions}>
            {scanning ? 'Checking product...' : 'Position barcode in the frame'}
          </Text>
          {scanning && <ActivityIndicator color="#fff" size="large" />}
        </View>
      </View>

      {/* Cancel button */}
      <TouchableOpacity
        style={styles.cancelButton}
        onPress={() => router.back()}
      >
        <Text style={styles.cancelText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  message: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#2E7D32',
    padding: 16,
    borderRadius: 8,
    marginHorizontal: 40,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  overlay: {
    flex: 1,
  },
  topOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  middleRow: {
    flexDirection: 'row',
    height: 250,
  },
  sideOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  scanArea: {
    width: 300,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#2E7D32',
    borderWidth: 4,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderBottomWidth: 0,
    borderRightWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderTopWidth: 0,
    borderRightWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderTopWidth: 0,
    borderLeftWidth: 0,
  },
  bottomOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 40,
  },
  instructions: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  cancelButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  cancelText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
