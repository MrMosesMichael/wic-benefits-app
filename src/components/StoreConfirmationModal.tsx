/**
 * Store Confirmation Modal Component
 * Displays confirmation prompt for first-time store detection
 * Implements "Confirm store on first visit" requirement from spec
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from 'react-native';
import { Store } from '../types/store.types';

interface StoreConfirmationModalProps {
  visible: boolean;
  store: Store | null;
  confidence: number;
  onConfirm: () => void;
  onChangeStore: () => void;
  onDismiss: () => void;
}

export const StoreConfirmationModal: React.FC<StoreConfirmationModalProps> = ({
  visible,
  store,
  confidence,
  onConfirm,
  onChangeStore,
  onDismiss,
}) => {
  if (!store) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Confirm Your Store</Text>
            {confidence < 100 && (
              <View style={styles.confidenceBadge}>
                <Text style={styles.confidenceText}>{confidence}% match</Text>
              </View>
            )}
          </View>

          <View style={styles.storeInfo}>
            <Text style={styles.storeName}>{store.name}</Text>
            {store.chain && (
              <Text style={styles.storeChain}>{store.chain}</Text>
            )}
            <Text style={styles.storeAddress}>
              {store.address.street}
              {'\n'}
              {store.address.city}, {store.address.state} {store.address.zip}
            </Text>
            {store.wicAuthorized && (
              <View style={styles.wicBadge}>
                <Text style={styles.wicBadgeText}>✓ WIC Authorized</Text>
              </View>
            )}
          </View>

          <Text style={styles.message}>
            Is this the store you're shopping at?
          </Text>

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.changeButton}
              onPress={onChangeStore}
            >
              <Text style={styles.changeButtonText}>Choose Different Store</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.confirmButton}
              onPress={onConfirm}
            >
              <Text style={styles.confirmButtonText}>Yes, That's Right</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.dismissButton}
            onPress={onDismiss}
          >
            <Text style={styles.dismissButtonText}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  confidenceBadge: {
    backgroundColor: '#FFA500',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },
  storeInfo: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  storeName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  storeChain: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  storeAddress: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  wicBadge: {
    backgroundColor: '#E8F5E9',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  wicBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4CAF50',
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  actions: {
    gap: 12,
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  changeButton: {
    backgroundColor: '#FFF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#0066CC',
  },
  changeButtonText: {
    color: '#0066CC',
    fontSize: 16,
    fontWeight: '600',
  },
  dismissButton: {
    marginTop: 16,
    paddingVertical: 8,
    alignItems: 'center',
  },
  dismissButtonText: {
    color: '#999',
    fontSize: 14,
  },
});
