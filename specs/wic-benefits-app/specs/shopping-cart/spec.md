# Shopping Cart Specification

## Purpose

Provide a shopping cart that tracks WIC-eligible items during a shopping trip, clearly differentiating between items that are pending in the cart versus benefits that have been consumed after checkout.

## Requirements

### Requirement: Cart Overview

The system SHALL display a clear summary of items in the shopping cart.

#### Scenario: View cart contents
- WHEN user opens shopping cart
- THEN all items are displayed grouped by participant:
  ```
  🛒 Shopping Cart (7 items)
  Store: Kroger - Main St

  Maria (Postpartum)
  ├── Whole Milk 1 gal         ✓ In Cart
  ├── Eggs 1 dozen             ✓ In Cart
  └── Cheddar Cheese 16oz      ✓ In Cart

  Sofia (Infant)
  └── Similac Formula 12.4oz   ✓ In Cart

  Diego (Child)
  ├── Whole Milk 1 gal         ✓ In Cart
  ├── Cheerios 18oz            ✓ In Cart
  └── Apple Juice 64oz         ✓ In Cart

  [Continue Shopping]  [Checkout]
  ```

#### Scenario: Empty cart
- GIVEN no items are in cart
- WHEN user opens shopping cart
- THEN empty state message is shown
- AND "Start Scanning" call-to-action appears
- AND suggested items based on benefits are shown

#### Scenario: Cart badge indicator
- GIVEN items are in cart
- WHEN viewing any screen
- THEN cart icon shows item count badge
- AND badge color indicates pending status (amber)

### Requirement: Cart Item Management

The system SHALL allow users to manage items in their cart.

#### Scenario: Remove single item
- GIVEN an item is in the cart
- WHEN user swipes left or taps remove
- THEN confirmation prompt appears (optional, can disable)
- AND item is removed from cart
- AND benefit amount returns to "Available" state
- AND cart total updates

#### Scenario: Edit item quantity
- GIVEN an item allows quantity adjustment
- WHEN user taps quantity
- THEN quantity selector appears
- AND user can increase (up to available benefit) or decrease
- AND benefit reservation adjusts accordingly

#### Scenario: Change participant assignment
- GIVEN an item is assigned to one participant
- AND another participant could also use this benefit
- WHEN user taps "Change participant"
- THEN participant selector appears
- AND item moves to new participant's allocation

#### Scenario: Clear entire cart
- GIVEN items are in cart
- WHEN user taps "Clear Cart"
- THEN confirmation warning appears:
  ```
  Clear all items?
  7 items will be removed and benefits
  will be restored to available.
  [Cancel] [Clear All]
  ```
- AND all benefits return to "Available" state

### Requirement: Benefit Status Indicators

The system MUST clearly show the status of benefits for cart items.

#### Scenario: In-cart status display
- GIVEN items are in shopping cart
- WHEN viewing cart or benefits
- THEN items show "In Cart" status with:
  - Amber/yellow color coding
  - Shopping cart icon
  - "Pending" label
  - Tooltip: "Will be deducted when you checkout"

#### Scenario: Benefit summary in cart
- WHEN viewing cart
- THEN benefit impact summary is shown:
  ```
  Benefits Impact
  ┌────────────────────────────────────┐
  │ Category     In Cart    Remaining  │
  ├────────────────────────────────────┤
  │ Milk         2 gal      5 gal      │
  │ Eggs         1 doz      0 doz      │
  │ Cheese       16 oz      0 oz       │
  │ Formula      1 can      8 cans     │
  │ Cereal       18 oz      14 oz      │
  │ Juice        64 oz      0 oz       │
  └────────────────────────────────────┘
  ```

#### Scenario: Over-limit warning
- GIVEN user attempts to exceed available benefits
- WHEN adding item to cart
- THEN warning prevents over-allocation
- AND shows what's actually available
- AND offers partial add if applicable

### Requirement: Checkout Process

The system SHALL provide a checkout flow that finalizes benefit consumption.

#### Scenario: Initiate checkout
- GIVEN items are in cart
- WHEN user taps "Checkout"
- THEN checkout summary screen appears
- AND shows all items to be purchased
- AND shows benefits that will be consumed
- AND shows estimated totals by participant

#### Scenario: Checkout confirmation
- WHEN user confirms checkout
- THEN confirmation screen shows:
  ```
  Confirm Purchase

  This will mark these items as purchased
  and deduct from your WIC benefits:

  Maria: Milk (1 gal), Eggs (1 doz), Cheese (16 oz)
  Sofia: Formula (1 can)
  Diego: Milk (1 gal), Cereal (18 oz), Juice (64 oz)

  ⚠️ Make sure you've completed your
  store checkout before confirming.

  [Cancel] [Confirm Purchase]
  ```

#### Scenario: Post-checkout benefit update
- WHEN user confirms checkout
- THEN all "In Cart" items move to "Consumed" state
- AND benefits are permanently decremented
- AND transaction is logged with:
  - Timestamp
  - Store name
  - Items purchased
  - Benefits consumed per category
- AND cart is cleared
- AND success screen shows updated benefit balances

#### Scenario: Partial checkout
- GIVEN user only purchased some cart items
- WHEN user taps "Partial Checkout"
- THEN user can select which items were actually purchased
- AND only selected items are marked consumed
- AND unselected items remain in cart

### Requirement: Transaction History

The system SHALL maintain a history of completed shopping trips.

#### Scenario: View transaction history
- WHEN user opens transaction history
- THEN past shopping trips are listed:
  ```
  Transaction History

  Jan 15, 2024 - Kroger Main St
  7 items | Milk, Eggs, Cheese, Formula...
  [View Details]

  Jan 8, 2024 - Walmart Supercenter
  5 items | Milk, Juice, Cereal...
  [View Details]
  ```

#### Scenario: Transaction details
- WHEN user taps on a transaction
- THEN full details are shown:
  - Date and time
  - Store name and address
  - Items purchased (grouped by participant)
  - Benefits consumed per category
  - Remaining benefits after transaction

#### Scenario: Undo recent transaction
- GIVEN a transaction was recently completed
- WHEN user taps "Undo"
- THEN confirmation appears
- AND benefits are restored
- AND items return to cart
- AND transaction is marked as voided

### Requirement: Cart Session Management

The system SHALL manage cart sessions appropriately.

#### Scenario: Cart persistence
- GIVEN items are in cart
- WHEN user closes or backgrounds app
- THEN cart contents persist
- AND cart is restored when app reopens

#### Scenario: Cart timeout warning
- GIVEN items have been in cart for extended period
- WHEN user opens app
- THEN notification appears:
  ```
  Shopping cart has stale items
  Items added some time ago. Still shopping?
  [Keep Cart] [Clear Cart]
  ```

#### Scenario: Store change with active cart
- GIVEN items are in cart for Store A
- WHEN user's detected store changes to Store B
- THEN prompt appears:
  ```
  You've moved to a different store
  Your cart has items from Kroger.
  What would you like to do?
  [Keep Cart] [Start New Cart]
  ```

#### Scenario: New benefit period with active cart
- GIVEN items are in cart
- AND a new benefit period starts
- WHEN user opens cart
- THEN warning shows items may no longer be valid
- AND benefits are re-validated against new period
- AND invalid items are flagged

### Requirement: Cart Sharing (Optional)

The system SHOULD support sharing cart contents within a household.

#### Scenario: Share cart with household member
- GIVEN a household has multiple users
- WHEN primary user shares cart
- THEN other household members can view cart
- AND can see real-time updates

#### Scenario: Collaborative shopping
- GIVEN cart is shared
- WHEN one household member adds/removes items
- THEN changes sync to all viewers
- AND attribution shows who made changes

## Data Requirements

### Cart Data Structure

```typescript
interface ShoppingCart {
  id: string;
  householdId: string;
  storeId: string;
  storeName: string;
  status: 'active' | 'checking_out' | 'completed' | 'abandoned';
  createdAt: Date;
  updatedAt: Date;
  items: CartItem[];
}

interface CartItem {
  id: string;
  upc: string;
  productName: string;
  productImage?: string;
  participantId: string;
  participantName: string;
  benefitCategory: string;
  quantity: number;
  unit: string;
  addedAt: Date;
  addedBy?: string;  // For collaborative carts
}

interface Transaction {
  id: string;
  cartId: string;
  householdId: string;
  storeId: string;
  storeName: string;
  completedAt: Date;
  items: TransactionItem[];
  benefitsConsumed: BenefitConsumption[];
  status: 'completed' | 'voided';
  voidedAt?: Date;
  voidReason?: string;
}

interface TransactionItem {
  upc: string;
  productName: string;
  participantId: string;
  benefitCategory: string;
  quantity: number;
  unit: string;
}

interface BenefitConsumption {
  participantId: string;
  category: string;
  amountConsumed: number;
  unit: string;
  balanceAfter: number;
}
```

## UI Requirements

### Visual Indicators

| State | Color | Icon | Label |
|-------|-------|------|-------|
| Available | Green | ✓ | "Available" |
| In Cart | Amber/Yellow | 🛒 | "In Cart" / "Pending" |
| Consumed | Gray | ✓✓ | "Purchased" |

### Cart States Visual

```
Benefits Progress Bar:

[████████░░░░░░░░░░░░]
 Consumed  In Cart  Available
 (gray)    (amber)  (green)
```

## Offline Behavior

- Cart contents stored locally
- Items can be added/removed offline
- Checkout requires connectivity (to sync benefits)
- Queue checkout if offline, process when connected
