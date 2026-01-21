/**
 * Purchase Logging API - Usage Examples
 *
 * This file demonstrates how to use the Purchase Logging Service
 * to record purchases and decrement benefit balances.
 */

import { purchaseLoggingService, PurchaseLoggingService } from '../services/PurchaseLoggingService';

// ==================== Example 1: Basic Usage ====================

async function basicPurchaseLogging() {
  try {
    const result = await purchaseLoggingService.logPurchase({
      participantId: '1',
      category: 'milk',
      quantity: 1,
      unit: 'gal',
      productName: 'Great Value Whole Milk',
    });

    console.log('Purchase logged successfully!');
    console.log(`Product: ${result.purchase.productName}`);
    console.log(`Participant: ${result.participant.name}`);
    console.log(`New Balance: ${result.benefit.available} ${result.benefit.unit}`);
    console.log(`Total Consumed: ${result.benefit.consumed} ${result.benefit.unit}`);
  } catch (error: any) {
    console.error('Failed to log purchase:', error.message);
  }
}

// ==================== Example 2: With Validation ====================

async function purchaseLoggingWithValidation() {
  const request = {
    participantId: '1',
    category: 'eggs',
    quantity: 2,
    unit: 'doz',
    productName: 'Large White Eggs',
  };

  // Validate before sending
  const validation = purchaseLoggingService.validatePurchaseRequest(request);

  if (!validation.isValid) {
    console.error('Validation failed:', validation.error);
    return;
  }

  try {
    const result = await purchaseLoggingService.logPurchase(request);
    console.log('Purchase logged:', result);
  } catch (error: any) {
    console.error('API error:', error.message);
  }
}

// ==================== Example 3: Custom API Base URL ====================

async function customApiBaseUrl() {
  // Create service instance with custom API URL
  const service = new PurchaseLoggingService('https://api.example.com/api/v1');

  try {
    const result = await service.logPurchase({
      participantId: '1',
      category: 'cereal',
      quantity: 18,
      unit: 'oz',
      productName: 'Cheerios',
    });

    console.log('Purchase logged via custom API');
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

// ==================== Example 4: Error Handling ====================

async function errorHandlingExample() {
  try {
    // Attempt to log purchase with insufficient balance
    const result = await purchaseLoggingService.logPurchase({
      participantId: '1',
      category: 'milk',
      quantity: 999, // Way more than allocated
      unit: 'gal',
      productName: 'Milk',
    });
  } catch (error: any) {
    if (error.message.includes('Insufficient balance')) {
      console.log('Not enough benefits remaining');
      console.log('Error:', error.message);
    } else if (error.message.includes('not found')) {
      console.log('Participant or benefit not found');
    } else if (error.message.includes('Unit mismatch')) {
      console.log('Wrong unit for this category');
    } else {
      console.log('Unexpected error:', error.message);
    }
  }
}

// ==================== Example 5: React Native Component Usage ====================

/*
import { Alert } from 'react-native';
import { logPurchase } from '@/lib/services/api';

const LogPurchaseComponent = () => {
  const handleSubmit = async (formData) => {
    try {
      const result = await logPurchase({
        participantId: formData.participantId,
        category: formData.category,
        quantity: parseFloat(formData.quantity),
        unit: formData.unit,
        productName: formData.productName,
      });

      Alert.alert(
        'Success',
        `Purchase logged! ${result.participant.name} has ${result.benefit.available} ${result.benefit.unit} remaining.`
      );
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    // ... component JSX
  );
};
*/

// ==================== Example 6: Multiple Purchases ====================

async function logMultiplePurchases() {
  const purchases = [
    {
      participantId: '1',
      category: 'milk',
      quantity: 0.5,
      unit: 'gal',
      productName: 'Great Value 2% Milk',
    },
    {
      participantId: '1',
      category: 'eggs',
      quantity: 1,
      unit: 'doz',
      productName: 'Large Brown Eggs',
    },
    {
      participantId: '1',
      category: 'cereal',
      quantity: 12,
      unit: 'oz',
      productName: 'Cheerios',
    },
  ];

  for (const purchase of purchases) {
    try {
      const result = await purchaseLoggingService.logPurchase(purchase);
      console.log(`✓ Logged: ${result.purchase.productName}`);
    } catch (error: any) {
      console.error(`✗ Failed: ${purchase.productName} - ${error.message}`);
    }
  }
}

// ==================== Example 7: Real-Time Balance Tracking ====================

interface BenefitBalance {
  category: string;
  available: number;
  consumed: number;
  total: number;
  unit: string;
}

class BenefitTracker {
  private balances: Map<string, BenefitBalance> = new Map();

  async logAndTrack(
    participantId: string,
    category: string,
    quantity: number,
    unit: string,
    productName: string
  ) {
    try {
      const result = await purchaseLoggingService.logPurchase({
        participantId,
        category,
        quantity,
        unit,
        productName,
      });

      // Update local balance tracker
      this.balances.set(category, {
        category: result.benefit.category,
        available: parseFloat(result.benefit.available),
        consumed: parseFloat(result.benefit.consumed),
        total: parseFloat(result.benefit.total),
        unit: result.benefit.unit,
      });

      return result;
    } catch (error) {
      throw error;
    }
  }

  getBalance(category: string): BenefitBalance | undefined {
    return this.balances.get(category);
  }

  getAllBalances(): BenefitBalance[] {
    return Array.from(this.balances.values());
  }
}

// Usage:
async function trackingExample() {
  const tracker = new BenefitTracker();

  await tracker.logAndTrack('1', 'milk', 1, 'gal', 'Whole Milk');
  await tracker.logAndTrack('1', 'eggs', 1, 'doz', 'Eggs');

  console.log('Current balances:', tracker.getAllBalances());
  console.log('Milk balance:', tracker.getBalance('milk'));
}

// ==================== Export Examples for Testing ====================

export {
  basicPurchaseLogging,
  purchaseLoggingWithValidation,
  customApiBaseUrl,
  errorHandlingExample,
  logMultiplePurchases,
  BenefitTracker,
  trackingExample,
};
