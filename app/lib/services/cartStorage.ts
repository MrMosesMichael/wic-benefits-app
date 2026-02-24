/**
 * Local cart storage using AsyncStorage.
 *
 * Replaces backend cart API calls. Participant IDs in AsyncStorage are
 * timestamp strings (e.g. "1706723456789"), not integer DB PKs, so we
 * cannot use the backend cart endpoint which JOINs on the `benefits` table.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadHousehold } from './householdStorage';
import type { CartItem, Cart } from './api';

const CART_KEY = '@wic_cart';

export async function getLocalCart(): Promise<Cart> {
  const raw = await AsyncStorage.getItem(CART_KEY);
  if (!raw) {
    return { items: [] };
  }
  try {
    const parsed = JSON.parse(raw) as Cart;
    return { items: parsed.items ?? [] };
  } catch {
    return { items: [] };
  }
}

export async function addToLocalCart(
  participantId: string,
  upc: string,
  productName: string,
  category: string,
  quantity: number,
  unit: string,
  brand?: string,
  size?: string
): Promise<void> {
  const [cart, household] = await Promise.all([getLocalCart(), loadHousehold()]);

  // Resolve participant name/type for display
  let participant_name = 'My Household';
  let participant_type = '';
  if (household) {
    const p = household.participants.find(p => p.id === participantId);
    if (p) {
      participant_name = p.name;
      participant_type = p.type;
    }
  }

  const newItem: CartItem = {
    id: Date.now().toString(),
    upc,
    product_name: productName,
    brand,
    size,
    category,
    quantity,
    unit,
    participant_id: participantId,
    participant_name,
    participant_type,
    added_at: new Date().toISOString(),
  };

  cart.items.push(newItem);
  await AsyncStorage.setItem(CART_KEY, JSON.stringify(cart));
}

export async function removeFromLocalCart(itemId: string): Promise<void> {
  const cart = await getLocalCart();
  cart.items = cart.items.filter(item => item.id !== itemId);
  await AsyncStorage.setItem(CART_KEY, JSON.stringify(cart));
}

export async function clearLocalCart(): Promise<void> {
  await AsyncStorage.removeItem(CART_KEY);
}
