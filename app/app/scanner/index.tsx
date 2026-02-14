import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Modal, TextInput, Keyboard } from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { checkEligibility } from '@/lib/services/api';
import { useTranslation } from '@/lib/i18n/I18nContext';
import { useLocation } from '@/lib/hooks/useLocation';
import { lookupPlu, pluToResultParams, isValidPluFormat } from '@/lib/services/pluLookup';

type ScanMode = 'check' | 'shopping';

export default function Scanner() {
  const router = useRouter();
  const t = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const [isActive, setIsActive] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [scanMode, setScanMode] = useState<ScanMode>('check');
  const [showPluModal, setShowPluModal] = useState(false);
  const [pluInput, setPluInput] = useState('');
  const [pluError, setPluError] = useState('');
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

  const handlePluCheck = () => {
    const trimmed = pluInput.trim();
    if (!isValidPluFormat(trimmed)) {
      setPluError(t('scanner.pluInvalidFormat'));
      return;
    }

    const result = lookupPlu(trimmed);
    if (!result) {
      setPluError(t('scanner.pluInvalidFormat'));
      return;
    }

    Keyboard.dismiss();
    setShowPluModal(false);
    setPluInput('');
    setPluError('');

    router.replace({
      pathname: '/scanner/result',
      params: {
        ...pluToResultParams(result),
        scanMode,
      },
    });
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
          {!scanning && (
            <TouchableOpacity
              style={styles.pluButton}
              onPress={() => { setShowPluModal(true); setPluError(''); }}
              accessibilityRole="button"
              hitSlop={{ top: 8, bottom: 8 }}
            >
              <Text style={styles.pluButtonText}>{t('scanner.enterPluCode')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* PLU Entry Modal */}
      <Modal
        visible={showPluModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPluModal(false)}
      >
        <View style={styles.pluModalOverlay}>
          <View style={styles.pluModalContent} accessibilityViewIsModal={true}>
            <Text style={styles.pluModalTitle}>{t('scanner.pluModalTitle')}</Text>
            <Text style={styles.pluModalSubtitle}>{t('scanner.pluModalSubtitle')}</Text>

            <TextInput
              style={[styles.pluInput, pluError ? styles.pluInputError : null]}
              placeholder={t('scanner.pluInputPlaceholder')}
              placeholderTextColor="#999"
              value={pluInput}
              onChangeText={(text) => { setPluInput(text); setPluError(''); }}
              keyboardType="number-pad"
              maxLength={5}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handlePluCheck}
              accessibilityLabel="PLU code"
            />
            {pluError ? <Text style={styles.pluErrorText}>{pluError}</Text> : null}

            <View style={styles.pluModalButtons}>
              <TouchableOpacity
                style={[styles.pluModalButton, styles.pluModalButtonCancel]}
                onPress={() => { setShowPluModal(false); setPluInput(''); setPluError(''); }}
                accessibilityRole="button"
              >
                <Text style={styles.pluModalButtonCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pluModalButton, styles.pluModalButtonCheck]}
                onPress={handlePluCheck}
                accessibilityRole="button"
              >
                <Text style={styles.pluModalButtonCheckText}>{t('scanner.pluCheck')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Mode toggle — rendered after overlay so touches aren't intercepted */}
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
  pluButton: {
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 4,
  },
  pluButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  pluModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pluModalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 340,
  },
  pluModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  pluModalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  pluInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 14,
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: 4,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  pluInputError: {
    borderColor: '#C62828',
  },
  pluErrorText: {
    color: '#C62828',
    fontSize: 13,
    marginBottom: 8,
    textAlign: 'center',
  },
  pluModalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  pluModalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  pluModalButtonCancel: {
    backgroundColor: '#F5F5F5',
  },
  pluModalButtonCheck: {
    backgroundColor: '#2E7D32',
  },
  pluModalButtonCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  pluModalButtonCheckText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
