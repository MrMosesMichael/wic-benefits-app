/**
 * Purchase Logging Service
 *
 * Handles logging purchases and decrementing benefit balances.
 * This service integrates with the backend API to record purchases
 * and update the three-state benefit tracking system.
 */

export interface LogPurchaseRequest {
  participantId: string;
  category: string;
  quantity: number;
  unit: string;
  productName?: string;
}

export interface BenefitAmount {
  category: string;
  categoryLabel: string;
  available: string;
  inCart: string;
  consumed: string;
  total: string;
  unit: string;
  periodStart?: string;
  periodEnd?: string;
}

export interface LogPurchaseResponse {
  purchase: {
    productName: string;
    category: string;
    categoryLabel: string;
    quantity: string;
    unit: string;
    participantId: number;
    participantName: string;
    timestamp: string;
  };
  benefit: BenefitAmount & {
    id: number;
    participantId: number;
  };
  participant: {
    id: number;
    householdId: number;
    type: string;
    name: string;
  };
}

export class PurchaseLoggingService {
  private apiBaseUrl: string;

  constructor(apiBaseUrl: string = 'http://localhost:3000/api/v1') {
    this.apiBaseUrl = apiBaseUrl;
  }

  /**
   * Log a purchase and decrement available benefits
   *
   * @param request - Purchase details including participant, category, quantity, and unit
   * @returns Promise with purchase confirmation and updated benefit data
   * @throws Error if insufficient balance, participant not found, or API error
   */
  async logPurchase(request: LogPurchaseRequest): Promise<LogPurchaseResponse> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/manual-benefits/log-purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to log purchase');
      }

      return data.data;
    } catch (error) {
      console.error('Failed to log purchase:', error);
      throw error;
    }
  }

  /**
   * Validate purchase request before submitting
   *
   * @param request - Purchase request to validate
   * @returns Object with isValid flag and error message if invalid
   */
  validatePurchaseRequest(request: LogPurchaseRequest): {
    isValid: boolean;
    error?: string
  } {
    if (!request.participantId) {
      return { isValid: false, error: 'Participant ID is required' };
    }

    if (!request.category) {
      return { isValid: false, error: 'Category is required' };
    }

    if (request.quantity === undefined || request.quantity === null) {
      return { isValid: false, error: 'Quantity is required' };
    }

    if (typeof request.quantity !== 'number' || request.quantity <= 0) {
      return { isValid: false, error: 'Quantity must be a positive number' };
    }

    if (!request.unit) {
      return { isValid: false, error: 'Unit is required' };
    }

    return { isValid: true };
  }
}

// Export a default instance
export const purchaseLoggingService = new PurchaseLoggingService();

export default PurchaseLoggingService;
