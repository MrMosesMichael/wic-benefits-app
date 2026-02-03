import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import * as Location from 'expo-location';
import { reportFormulaSimple, getNearbyStores } from '@/lib/services/api';
import QuantitySelector from './QuantitySelector';
import type { QuantitySeen, Store } from '@/lib/types';
import { useTranslation } from '@/lib/i18n/I18nContext';

interface FormulaSightingModalProps {
  visible: boolean;
  onClose: () => void;
  formulaUpc: string;
  formulaName: string;
  preselectedStoreId?: string;
}

export default function FormulaSightingModal({
  visible,
  onClose,
  formulaUpc,
  formulaName,
  preselectedStoreId,
}: FormulaSightingModalProps) {
  const t = useTranslation();
  const [step, setStep] = useState<'quantity' | 'store' | 'submitting' | 'success'>('quantity');
  const [quantity, setQuantity] = useState<QuantitySeen | null>(null);
  const [nearbyStores, setNearbyStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loadingStores, setLoadingStores] = useState(false);
  const [impactMessage, setImpactMessage] = useState<string>('');

  useEffect(() => {
    if (visible) {
      getLocation();
    } else {
      // Reset when modal closes
      setStep('quantity');
      setQuantity(null);
      setSelectedStore(null);
      setImpactMessage('');
    }
  }, [visible]);

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const coords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
        setLocation(coords);
        loadNearbyStores(coords.lat, coords.lng);
      }
    } catch (error) {
      console.error('Failed to get location:', error);
    }
  };

  const loadNearbyStores = async (lat: number, lng: number) => {
    try {
      setLoadingStores(true);
      const stores = await getNearbyStores(lat, lng, 5, undefined, true);
      setNearbyStores(stores);

      // Auto-select preselected or closest store
      if (preselectedStoreId) {
        const preselected = stores.find(s => s.storeId === preselectedStoreId);
        if (preselected) {
          setSelectedStore(preselected);
        }
      } else if (stores.length > 0) {
        setSelectedStore(stores[0]);
      }
    } catch (error) {
      console.error('Failed to load nearby stores:', error);
    } finally {
      setLoadingStores(false);
    }
  };

  const handleQuantitySelect = (q: QuantitySeen) => {
    setQuantity(q);
    setStep('store');
  };

  const handleSubmit = async () => {
    if (!quantity || !selectedStore) return;

    setStep('submitting');

    try {
      const response = await reportFormulaSimple(
        formulaUpc,
        selectedStore.storeId,
        quantity,
        location?.lat,
        location?.lng
      );

      setImpactMessage(response.impactMessage || 'Your report helps other families!');
      setStep('success');

      // Auto-close after 2 seconds
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Failed to submit report:', error);
      Alert.alert('Error', 'Failed to submit your report. Please try again.');
      setStep('store');
    }
  };

  const renderQuantityStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>
        {t('formulaSighting.quantityQuestion', { formula: formulaName })}
      </Text>
      <QuantitySelector value={quantity} onChange={handleQuantitySelect} hideTitle />
      <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
        <Text style={styles.cancelButtonText}>{t('formulaSighting.cancel')}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStoreStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>{t('formulaSighting.storeQuestion')}</Text>

      {loadingStores ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1976D2" />
          <Text style={styles.loadingText}>{t('formulaSighting.findingStores')}</Text>
        </View>
      ) : nearbyStores.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {t('formulaSighting.noStoresFound')}
          </Text>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>{t('formulaSighting.close')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.storeList} showsVerticalScrollIndicator={false}>
          {nearbyStores.map((store) => (
            <TouchableOpacity
              key={store.storeId}
              style={[
                styles.storeOption,
                selectedStore?.storeId === store.storeId && styles.storeOptionSelected,
              ]}
              onPress={() => setSelectedStore(store)}
            >
              <View style={styles.storeInfo}>
                <Text style={styles.storeName}>{store.name}</Text>
                <Text style={styles.storeAddress}>
                  {store.streetAddress}, {store.city}
                </Text>
              </View>
              <Text style={styles.storeDistance}>{store.distanceMiles} mi</Text>
            </TouchableOpacity>
          ))}

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setStep('quantity')}
            >
              <Text style={styles.backButtonText}>← {t('formulaSighting.back')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.submitButton,
                !selectedStore && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!selectedStore}
            >
              <Text style={styles.submitButtonText}>{t('formulaSighting.submitReport')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </View>
  );

  const renderSubmittingStep = () => (
    <View style={styles.statusContainer}>
      <ActivityIndicator size="large" color="#1976D2" />
      <Text style={styles.statusText}>{t('formulaSighting.submitting')}</Text>
    </View>
  );

  const renderSuccessStep = () => (
    <View style={styles.statusContainer}>
      <Text style={styles.successIcon}>✓</Text>
      <Text style={styles.successTitle}>{t('formulaSighting.thankYou')}</Text>
      <Text style={styles.successMessage}>{impactMessage || t('formulaSighting.impactMessage')}</Text>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{t('formulaSighting.modalTitle')}</Text>
            <Text style={styles.headerSubtitle}>{t('formulaSighting.modalSubtitle')}</Text>
          </View>

          {step === 'quantity' && renderQuantityStep()}
          {step === 'store' && renderStoreStep()}
          {step === 'submitting' && renderSubmittingStep()}
          {step === 'success' && renderSuccessStep()}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  header: {
    backgroundColor: '#1976D2',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  stepContainer: {
    padding: 20,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  storeList: {
    maxHeight: 300,
  },
  storeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    marginBottom: 10,
  },
  storeOptionSelected: {
    borderColor: '#1976D2',
    backgroundColor: '#E3F2FD',
  },
  storeInfo: {
    flex: 1,
  },
  storeName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  storeAddress: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  storeDistance: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1976D2',
    marginLeft: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  backButton: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  submitButton: {
    flex: 2,
    backgroundColor: '#4CAF50',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#A5D6A7',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  statusContainer: {
    padding: 60,
    alignItems: 'center',
  },
  statusText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  successIcon: {
    fontSize: 72,
    color: '#4CAF50',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
});
