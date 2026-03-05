import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { getCart, removeFromCart, clearCart, checkout, Cart } from '@/lib/services/api';
import { useTranslation } from '@/lib/i18n/I18nContext';
import NeedHelpLink from '@/components/NeedHelpLink';
import { colors, fonts, card } from '@/lib/theme';

export default function CartScreen() {
  const router = useRouter();
  const t = useTranslation();
  const insets = useSafeAreaInsets();
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
        <ActivityIndicator size="large" color={colors.header} />
        <Text style={styles.loadingText}>{t('cart.loading')}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{t('cart.failedToLoad')}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadCart} accessibilityRole="button">
          <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyIcon} accessible={false} importantForAccessibility="no">🛒</Text>
        <Text style={styles.emptyTitle}>{t('cart.emptyCart')}</Text>
        <Text style={styles.emptySubtitle}>{t('cart.emptyCartSubtitle')}</Text>
        <TouchableOpacity
          style={styles.startScanningButton}
          onPress={() => router.push('/scanner')}
          accessibilityRole="button"
          accessibilityHint={t('a11y.cart.scanHint')}
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
      <ScrollView style={styles.scrollView}>
        {Object.entries(itemsByParticipant).map(([participantId, items]) => {
          const firstItem = items[0];
          return (
            <View key={participantId} style={styles.participantSection}>
              <View style={styles.participantHeader}>
                <Text style={styles.participantName} accessibilityRole="header">{firstItem.participant_name}</Text>
                <View style={styles.typeBadge}>
                  <Text style={styles.typeText}>{firstItem.participant_type}</Text>
                </View>
              </View>

              {items.map(item => (
                <View
                  key={item.id}
                  style={styles.cartItem}
                  accessible={true}
                  accessibilityLabel={`${item.product_name}${item.brand ? `, ${item.brand}` : ''}${item.size ? `, ${item.size}` : ''}, ${item.category}, ${item.quantity} ${item.unit}`}
                >
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
                    accessibilityRole="button"
                    accessibilityLabel={t('a11y.cart.removeLabel', { product: item.product_name })}
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
            accessibilityRole="button"
            accessibilityHint={t('a11y.cart.clearHint')}
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

      <View style={[styles.footer, { paddingBottom: Math.max(16, insets.bottom) }]}>
        <TouchableOpacity
          style={styles.checkoutButton}
          onPress={handleCheckout}
          accessibilityRole="button"
          accessibilityLabel={t('a11y.cart.checkoutLabel', { count: cart.items.length })}
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
    backgroundColor: colors.screenBg,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.screenBg,
  },
  header: {
    backgroundColor: colors.cardBg,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.header,
  },
  itemCount: {
    fontSize: 14,
    color: colors.muted,
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.muted,
  },
  errorText: {
    fontSize: 16,
    color: colors.danger,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: colors.header,
    padding: 16,
    borderRadius: 8,
    minWidth: 200,
    alignItems: 'center',
  },
  retryButtonText: {
    color: colors.white,
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
    color: colors.navy,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: 24,
  },
  startScanningButton: {
    backgroundColor: colors.header,
    padding: 16,
    borderRadius: 8,
    minWidth: 200,
    alignItems: 'center',
  },
  startScanningButtonText: {
    color: colors.white,
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
    color: colors.navy,
  },
  typeBadge: {
    backgroundColor: colors.screenBg,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.dustyBlue,
    textTransform: 'capitalize',
  },
  cartItem: {
    ...card,
    marginBottom: 12,
  },
  itemInfo: {
    flex: 1,
    marginBottom: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.navy,
    marginBottom: 4,
  },
  brand: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: 2,
  },
  size: {
    fontSize: 14,
    color: colors.muted,
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
    color: colors.success,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  quantity: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.navy,
  },
  removeButton: {
    backgroundColor: colors.screenBg,
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.danger,
  },
  removeButtonText: {
    color: colors.danger,
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
    backgroundColor: colors.cardBg,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.danger,
  },
  clearButtonText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    backgroundColor: colors.cardBg,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  checkoutButton: {
    backgroundColor: colors.header,
    padding: 18,
    borderRadius: 8,
    alignItems: 'center',
  },
  checkoutButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '700',
  },
});
