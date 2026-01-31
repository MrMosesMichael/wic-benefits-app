import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { getCart, removeFromCart, clearCart, checkout, Cart } from '@/lib/services/api';
import { useTranslation } from '@/lib/i18n/I18nContext';
import NeedHelpLink from '@/components/NeedHelpLink';

export default function CartScreen() {
  const router = useRouter();
  const t = useTranslation();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = async () => {
    try {
      setError(null);
      const data = await getCart();
      setCart(data);
    } catch (err) {
      console.error('Failed to load cart:', err);
      setError('Failed to load cart. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveItem = (itemId: string, productName: string) => {
    Alert.alert(
      t('cart.removeItem'),
      t('cart.removeItemConfirm', { product: productName }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('cart.remove'),
          style: 'destructive',
          onPress: async () => {
            try {
              await removeFromCart(itemId);
              await loadCart();
            } catch (err) {
              console.error('Failed to remove item:', err);
              Alert.alert(t('common.error'), 'Failed to remove item from cart');
            }
          },
        },
      ]
    );
  };

  const handleClearCart = () => {
    if (!cart || cart.items.length === 0) {
      return;
    }

    Alert.alert(
      t('cart.clearCart'),
      t('cart.clearCartConfirm', { count: cart.items.length }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('cart.clearAll'),
          style: 'destructive',
          onPress: async () => {
            try {
              await clearCart();
              await loadCart();
            } catch (err) {
              console.error('Failed to clear cart:', err);
              Alert.alert(t('common.error'), 'Failed to clear cart');
            }
          },
        },
      ]
    );
  };

  const handleCheckout = () => {
    if (!cart || cart.items.length === 0) {
      Alert.alert(t('cart.emptyCartTitle'), t('cart.emptyCartMessage'));
      return;
    }

    Alert.alert(
      t('cart.confirmCheckout'),
      t('cart.confirmCheckoutMessage', { count: cart.items.length }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('cart.checkout'),
          onPress: async () => {
            try {
              const result = await checkout();
              Alert.alert(
                t('cart.checkoutComplete'),
                t('cart.checkoutSuccess', { count: result.itemsProcessed }),
                [
                  {
                    text: t('home.viewBenefits'),
                    onPress: () => router.push('/benefits'),
                  },
                  {
                    text: t('result.continueShopping'),
                    onPress: () => router.push('/scanner'),
                  },
                ]
              );
              await loadCart();
            } catch (err: any) {
              console.error('Checkout failed:', err);
              Alert.alert(t('cart.checkoutFailed'), err.message || 'Failed to complete checkout');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={styles.loadingText}>{t('cart.loading')}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{t('cart.failedToLoad')}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadCart}>
          <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyIcon}>🛒</Text>
        <Text style={styles.emptyTitle}>{t('cart.emptyCart')}</Text>
        <Text style={styles.emptySubtitle}>{t('cart.emptyCartSubtitle')}</Text>
        <TouchableOpacity
          style={styles.startScanningButton}
          onPress={() => router.push('/scanner')}
        >
          <Text style={styles.startScanningButtonText}>{t('cart.startScanning')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Group items by participant
  const itemsByParticipant: { [key: string]: typeof cart.items } = {};
  cart.items.forEach(item => {
    if (!itemsByParticipant[item.participant_id]) {
      itemsByParticipant[item.participant_id] = [];
    }
    itemsByParticipant[item.participant_id].push(item);
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('cart.title')}</Text>
        <Text style={styles.itemCount}>{t('cart.itemCount', { count: cart.items.length })}</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        {Object.entries(itemsByParticipant).map(([participantId, items]) => {
          const firstItem = items[0];
          return (
            <View key={participantId} style={styles.participantSection}>
              <View style={styles.participantHeader}>
                <Text style={styles.participantName}>{firstItem.participant_name}</Text>
                <View style={styles.typeBadge}>
                  <Text style={styles.typeText}>{firstItem.participant_type}</Text>
                </View>
              </View>

              {items.map(item => (
                <View key={item.id} style={styles.cartItem}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.productName}>{item.product_name}</Text>
                    {item.brand && <Text style={styles.brand}>{item.brand}</Text>}
                    {item.size && <Text style={styles.size}>{item.size}</Text>}
                    <View style={styles.itemDetails}>
                      <Text style={styles.category}>{item.category}</Text>
                      <Text style={styles.quantity}>
                        {item.quantity} {item.unit}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => handleRemoveItem(item.id, item.product_name)}
                  >
                    <Text style={styles.removeButtonText}>{t('cart.remove')}</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          );
        })}

        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClearCart}
          >
            <Text style={styles.clearButtonText}>{t('cart.clearAllItems')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.helpLinkContainer}>
          <NeedHelpLink 
            variant="card"
            faqId="checkout-rejected"
            contextHint={t('help.checkoutTips')}
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.checkoutButton}
          onPress={handleCheckout}
        >
          <Text style={styles.checkoutButtonText}>{t('cart.checkout')} ({cart.items.length})</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  itemCount: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#C62828',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#2E7D32',
    padding: 16,
    borderRadius: 8,
    minWidth: 200,
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  startScanningButton: {
    backgroundColor: '#2E7D32',
    padding: 16,
    borderRadius: 8,
    minWidth: 200,
    alignItems: 'center',
  },
  startScanningButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  participantSection: {
    marginTop: 16,
    marginHorizontal: 16,
  },
  participantHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  participantName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  typeBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1976D2',
    textTransform: 'capitalize',
  },
  cartItem: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  itemInfo: {
    flex: 1,
    marginBottom: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  brand: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  size: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  category: {
    fontSize: 13,
    color: '#2E7D32',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  quantity: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  removeButton: {
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EF9A9A',
  },
  removeButtonText: {
    color: '#C62828',
    fontSize: 14,
    fontWeight: '600',
  },
  actionsContainer: {
    padding: 16,
  },
  helpLinkContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  clearButton: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C62828',
  },
  clearButtonText: {
    color: '#C62828',
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  checkoutButton: {
    backgroundColor: '#2E7D32',
    padding: 18,
    borderRadius: 8,
    alignItems: 'center',
  },
  checkoutButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});
