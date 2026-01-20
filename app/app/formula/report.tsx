import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { getFormulaByUpc, getNearbyStores, reportFormulaSimple } from '@/lib/services/api';
import QuantitySelector from '@/components/QuantitySelector';
import type { WicFormula, Store, QuantitySeen } from '@/lib/types';

type ReportStep = 'scan' | 'confirm' | 'quantity' | 'store' | 'success';

export default function FormulaReport() {
  const router = useRouter();
  const params = useLocalSearchParams<{ upc?: string; storeId?: string }>();

  const [permission, requestPermission] = useCameraPermissions();
  const [step, setStep] = useState<ReportStep>('scan');
  const [scannedUpc, setScannedUpc] = useState<string | null>(params.upc || null);
  const [formula, setFormula] = useState<WicFormula | null>(null);
  const [quantity, setQuantity] = useState<QuantitySeen | null>(null);
  const [nearbyStores, setNearbyStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Get location on mount
  useEffect(() => {
    getLocation();
  }, []);

  // If UPC provided via params, skip to confirm step
  useEffect(() => {
    if (params.upc) {
      setScannedUpc(params.upc);
      lookupFormula(params.upc);
    }
  }, [params.upc]);

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        loadNearbyStores(loc.coords.latitude, loc.coords.longitude);
      }
    } catch (error) {
      console.error('Failed to get location:', error);
    }
  };

  const loadNearbyStores = async (lat: number, lng: number) => {
    try {
      const stores = await getNearbyStores(lat, lng, 5, undefined, true);
      setNearbyStores(stores);
      // Auto-select closest store
      if (stores.length > 0) {
        setSelectedStore(stores[0]);
      }
    } catch (error) {
      console.error('Failed to load nearby stores:', error);
    }
  };

  const lookupFormula = async (upc: string) => {
    try {
      setLoading(true);
      const result = await getFormulaByUpc(upc);
      setFormula(result);
      setStep('confirm');
    } catch (error) {
      console.error('Failed to lookup formula:', error);
      Alert.alert('Error', 'Failed to look up this product. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scannedUpc) return; // Prevent multiple scans
    setScannedUpc(data);
    lookupFormula(data);
  };

  const handleConfirmProduct = () => {
    setStep('quantity');
  };

  const handleNotMyProduct = () => {
    setScannedUpc(null);
    setFormula(null);
    setStep('scan');
  };

  const handleQuantitySelect = (q: QuantitySeen) => {
    setQuantity(q);
    setStep('store');
  };

  const handleStoreSelect = (store: Store) => {
    setSelectedStore(store);
  };

  const handleSubmit = async () => {
    if (!scannedUpc || !quantity || !selectedStore) return;

    try {
      setSubmitting(true);
      await reportFormulaSimple(
        scannedUpc,
        selectedStore.storeId,
        quantity,
        location?.lat,
        location?.lng
      );
      setStep('success');
    } catch (error) {
      console.error('Failed to submit report:', error);
      Alert.alert('Error', 'Failed to submit your report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Request camera permission if needed
  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted && step === 'scan') {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>
          Camera permission is needed to scan formula barcodes
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Report Formula</Text>
        <Text style={styles.subtitle}>Help others find formula</Text>
      </View>

      {/* Step: Scan */}
      {step === 'scan' && (
        <View style={styles.scanContainer}>
          <CameraView
            style={styles.camera}
            barcodeScannerSettings={{
              barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'],
            }}
            onBarcodeScanned={handleBarCodeScanned}
          >
            <View style={styles.scanOverlay}>
              <View style={styles.scanFrame} />
              <Text style={styles.scanInstructions}>
                Point camera at formula barcode
              </Text>
            </View>
          </CameraView>
        </View>
      )}

      {/* Step: Confirm Product */}
      {step === 'confirm' && (
        <ScrollView style={styles.stepContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#1976D2" />
              <Text style={styles.loadingText}>Looking up product...</Text>
            </View>
          ) : formula ? (
            <View style={styles.confirmCard}>
              <Text style={styles.confirmTitle}>Is this your product?</Text>
              <View style={styles.productInfo}>
                <Text style={styles.productBrand}>{formula.brand}</Text>
                <Text style={styles.productName}>{formula.productName}</Text>
                <Text style={styles.productMeta}>
                  {formula.form} • {formula.size}
                </Text>
              </View>
              <View style={styles.confirmButtons}>
                <TouchableOpacity
                  style={styles.confirmButtonNo}
                  onPress={handleNotMyProduct}
                >
                  <Text style={styles.confirmButtonNoText}>No, scan again</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.confirmButtonYes}
                  onPress={handleConfirmProduct}
                >
                  <Text style={styles.confirmButtonYesText}>Yes, this is it</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.unknownProduct}>
              <Text style={styles.unknownTitle}>Unknown Product</Text>
              <Text style={styles.unknownText}>
                This barcode wasn't recognized as a WIC formula.
              </Text>
              <TouchableOpacity
                style={styles.tryAgainButton}
                onPress={handleNotMyProduct}
              >
                <Text style={styles.tryAgainButtonText}>Scan Again</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      {/* Step: Quantity */}
      {step === 'quantity' && (
        <ScrollView style={styles.stepContainer}>
          <View style={styles.quantityCard}>
            <Text style={styles.stepTitle}>
              How much {formula?.brand} {formula?.productName} did you see?
            </Text>
            <QuantitySelector
              value={quantity}
              onChange={handleQuantitySelect}
            />
          </View>
        </ScrollView>
      )}

      {/* Step: Store Selection */}
      {step === 'store' && (
        <ScrollView style={styles.stepContainer}>
          <View style={styles.storeCard}>
            <Text style={styles.stepTitle}>Which store are you at?</Text>
            {nearbyStores.length === 0 ? (
              <View style={styles.noStores}>
                <Text style={styles.noStoresText}>
                  No stores found nearby. Please enable location services.
                </Text>
              </View>
            ) : (
              <>
                {nearbyStores.map((store) => (
                  <TouchableOpacity
                    key={store.storeId}
                    style={[
                      styles.storeOption,
                      selectedStore?.storeId === store.storeId && styles.storeOptionSelected
                    ]}
                    onPress={() => handleStoreSelect(store)}
                  >
                    <View style={styles.storeOptionInfo}>
                      <Text style={styles.storeOptionName}>{store.name}</Text>
                      <Text style={styles.storeOptionAddress}>
                        {store.streetAddress}, {store.city}
                      </Text>
                    </View>
                    <Text style={styles.storeOptionDistance}>
                      {store.distanceMiles} mi
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    (!selectedStore || submitting) && styles.submitButtonDisabled
                  ]}
                  onPress={handleSubmit}
                  disabled={!selectedStore || submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.submitButtonText}>Submit Report</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      )}

      {/* Step: Success */}
      {step === 'success' && (
        <View style={styles.successContainer}>
          <Text style={styles.successIcon}>✓</Text>
          <Text style={styles.successTitle}>Thank You!</Text>
          <Text style={styles.successText}>
            Your report helps other families find formula.
          </Text>
          <TouchableOpacity
            style={styles.successButton}
            onPress={() => router.push('/formula')}
          >
            <Text style={styles.successButtonText}>Back to Formula Finder</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.reportAnotherButton}
            onPress={() => {
              setScannedUpc(null);
              setFormula(null);
              setQuantity(null);
              setStep('scan');
            }}
          >
            <Text style={styles.reportAnotherButtonText}>Report Another</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#1976D2',
    padding: 20,
    paddingTop: 60,
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
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#f5f5f5',
  },
  permissionText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  permissionButton: {
    backgroundColor: '#1976D2',
    padding: 16,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  scanContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  scanOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  scanFrame: {
    width: 250,
    height: 150,
    borderWidth: 3,
    borderColor: '#fff',
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  scanInstructions: {
    marginTop: 20,
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  stepContainer: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  confirmCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  productInfo: {
    alignItems: 'center',
    marginBottom: 24,
  },
  productBrand: {
    fontSize: 14,
    color: '#666',
    textTransform: 'uppercase',
  },
  productName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 4,
  },
  productMeta: {
    fontSize: 14,
    color: '#888',
    marginTop: 8,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmButtonNo: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonNoText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  confirmButtonYes: {
    flex: 1,
    backgroundColor: '#4CAF50',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonYesText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  unknownProduct: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  unknownTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F44336',
    marginBottom: 8,
  },
  unknownText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  tryAgainButton: {
    backgroundColor: '#1976D2',
    padding: 14,
    borderRadius: 8,
    paddingHorizontal: 32,
  },
  tryAgainButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  quantityCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  storeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
  },
  noStores: {
    padding: 20,
    alignItems: 'center',
  },
  noStoresText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  storeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    marginTop: 12,
  },
  storeOptionSelected: {
    borderColor: '#1976D2',
    backgroundColor: '#E3F2FD',
  },
  storeOptionInfo: {
    flex: 1,
  },
  storeOptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  storeOptionAddress: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  storeOptionDistance: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976D2',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  submitButtonDisabled: {
    backgroundColor: '#A5D6A7',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  successIcon: {
    fontSize: 80,
    color: '#4CAF50',
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  successText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  successButton: {
    backgroundColor: '#1976D2',
    padding: 16,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  successButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  reportAnotherButton: {
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  reportAnotherButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
});
