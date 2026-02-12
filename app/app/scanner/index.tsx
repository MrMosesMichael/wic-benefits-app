import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { checkEligibility } from '@/lib/services/api';
import { useTranslation } from '@/lib/i18n/I18nContext';
import { useLocation } from '@/lib/hooks/useLocation';

type ScanMode = 'check' | 'shopping';

export default function Scanner() {
  const router = useRouter();
  const t = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const [isActive, setIsActive] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [scanMode, setScanMode] = useState<ScanMode>('check');
  const { location } = useLocation();
  const detectedState = location?.state;

  useEffect(() => {
    // Reset scanning state when component mounts
    setIsActive(true);
    setLastScannedCode(null);
  }, []);

  const handleBarCodeScanned = async ({ data }: { type: string; data: string }) => {
    if (!isActive || scanning) return;

    // Prevent duplicate scans
    if (data === lastScannedCode) return;

    setLastScannedCode(data);
    setScanning(true);
    setIsActive(false);

    try {
      console.log('Scanned UPC:', data);
      const result = await checkEligibility(data, detectedState);

      // Navigate to result screen with data (replace instead of push to avoid stacking)
      router.replace({
        pathname: '/scanner/result',
        params: {
          upc: result.product.upc,
          name: result.product.name,
          brand: result.product.brand || '',
          size: result.product.size || '',
          eligible: result.eligible ? 'true' : 'false',
          category: result.category || '',
          reason: result.reason || '',
          scanMode: scanMode,
        },
      });
    } catch (error) {
      console.error('Error checking eligibility:', error);
      Alert.alert(
        t('scanner.errorTitle'),
        t('scanner.errorMessage'),
        [{ text: t('common.ok'), onPress: () => { setIsActive(true); setScanning(false); } }]
      );
    } finally {
      setScanning(false);
    }
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={styles.message}>{t('scanner.requestingPermission')}</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>{t('scanner.permissionRequired')}</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission} accessibilityRole="button">
          <Text style={styles.permissionButtonText}>{t('scanner.grantPermission')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'upc_a', 'upc_e'],
        }}
        onBarcodeScanned={isActive && !scanning ? handleBarCodeScanned : undefined}
        accessible={false}
      />

      {/* Mode toggle */}
      <View style={styles.modeToggle} accessibilityRole="tablist">
        <TouchableOpacity
          style={[styles.modeButton, scanMode === 'check' && styles.modeButtonActive]}
          onPress={() => setScanMode('check')}
          accessibilityRole="tab"
          accessibilityState={{ selected: scanMode === 'check' }}
          hitSlop={{ top: 6, bottom: 6 }}
        >
          <Text style={[styles.modeButtonText, scanMode === 'check' && styles.modeButtonTextActive]}>
            {t('scanner.checkEligibility')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeButton, scanMode === 'shopping' && styles.modeButtonActive]}
          onPress={() => setScanMode('shopping')}
          accessibilityRole="tab"
          accessibilityState={{ selected: scanMode === 'shopping' }}
          hitSlop={{ top: 6, bottom: 6 }}
        >
          <Text style={[styles.modeButtonText, scanMode === 'shopping' && styles.modeButtonTextActive]}>
            {t('scanner.shoppingMode')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Scanning overlay */}
      <View style={styles.overlay}>
        <View style={styles.topOverlay} />
        <View style={styles.middleRow}>
          <View style={styles.sideOverlay} />
          <View style={styles.scanArea}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
          <View style={styles.sideOverlay} />
        </View>
        <View style={styles.bottomOverlay}>
          <Text style={styles.instructions}>
            {scanning ? t('scanner.checkingProduct') : t('scanner.positionBarcode')}
          </Text>
          {scanning && <ActivityIndicator color="#fff" size="large" />}
        </View>
      </View>

      {/* Cancel button */}
      <TouchableOpacity
        style={styles.cancelButton}
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel={t('a11y.scanner.cancelLabel')}
        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
      >
        <Text style={styles.cancelText}>{t('scanner.cancel')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 40,
  },
  permissionButton: {
    backgroundColor: '#2E7D32',
    padding: 16,
    borderRadius: 8,
    marginHorizontal: 40,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
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
  modeToggle: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 100,
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 8,
    padding: 4,
    gap: 4,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: '#2E7D32',
  },
  modeButtonText: {
    color: '#999',
    fontSize: 13,
    fontWeight: '600',
  },
  modeButtonTextActive: {
    color: '#fff',
  },
});
