# Benefits Balance Specification

## Purpose

Allow WIC participants to view their current benefits balance, track remaining allowances by category, manage multi-participant households, and monitor benefit consumption status during shopping trips.

## Requirements

### Requirement: Benefits Overview

The system SHALL display a summary of the user's current WIC benefits.

#### Scenario: View monthly benefits summary
- GIVEN the user is authenticated with their WIC account
- WHEN the user opens the benefits screen
- THEN the current benefit period dates are displayed
- AND each benefit category shows allocated vs remaining amounts
- AND a visual progress indicator shows utilization percentage
- AND "in cart" amounts are shown separately from available amounts

#### Scenario: View benefits by category
- GIVEN the user is viewing benefits summary
- WHEN the user taps on a benefit category (e.g., "Milk")
- THEN detailed information expands
- AND shows specific product types allowed
- AND shows quantity/amount remaining (excluding in-cart items)
- AND shows quantity currently in cart (pending)
- AND lists recent purchases against that category

### Requirement: Benefits Categories

The system SHALL display benefits organized by WIC food package categories.

#### Scenario: Display standard categories
- WHEN the benefits are displayed
- THEN categories include (as applicable to participant):
  - Milk
  - Cheese
  - Eggs
  - Fruits & Vegetables (CVV - Cash Value Voucher)
  - Whole Grains (Bread, Cereal, Rice, Pasta)
  - Juice
  - Peanut Butter / Beans / Legumes
  - Infant Formula
  - Infant Cereal
  - Infant Fruits & Vegetables
  - Baby Food Meat
  - Yogurt
  - Fish (canned)

### Requirement: Multi-Participant Household Management (Hybrid Approach)

The system SHALL support households with multiple WIC participants using a hybrid unified/filtered view.

#### Scenario: Unified household view (default)
- GIVEN a household has multiple participants (e.g., mother + infant + child)
- WHEN viewing benefits
- THEN all participants are shown in a single scrollable view
- AND each participant section shows their name and type
- AND shared categories show combined totals with breakdown:
  ```
  Milk (Maria + Diego): 7 gal total
  ├── Maria (Postpartum): 4 gal remaining
  └── Diego (Child): 3 gal remaining
  ```

#### Scenario: Quick filter by participant
- GIVEN unified household view is displayed
- WHEN user taps participant filter chips
- THEN view filters to show only selected participant(s)
- AND benefit totals update to reflect selection
- AND filter state persists during shopping session

#### Scenario: Add participant to household
- GIVEN user needs to add a new participant
- WHEN user taps "Add Participant"
- THEN participant type selection appears (pregnant, infant, child, etc.)
- AND user enters participant name and relevant details
- AND benefits for new participant are entered or synced

#### Scenario: Edit participant details
- GIVEN a participant exists in household
- WHEN user taps edit on participant
- THEN user can update name, type, or remove participant
- AND infant age is calculated from birth date for stage transitions

#### Scenario: Scan result shows participant eligibility
- GIVEN a product is scanned
- AND multiple participants could use the benefit
- WHEN eligibility result displays
- THEN result shows which participants can claim it:
  ```
  ✓ Whole Milk (1 gal)
  Eligible for:
  • Maria (1 of 4 gal remaining)
  • Diego (1 of 3 gal remaining)
  [Add to Maria's Cart] [Add to Diego's Cart]
  ```

### Requirement: Benefits Data Source

The system MUST support multiple methods of obtaining benefits data.

#### Scenario: eWIC card integration (primary)
- GIVEN the user has linked their eWIC card
- WHEN benefits data is requested
- THEN real-time balance is retrieved from state eWIC system
- AND last sync timestamp is displayed

#### Scenario: Manual benefits entry (fallback)
- GIVEN eWIC integration is unavailable for user's state
- WHEN user sets up benefits tracking
- THEN user can manually enter their benefit amounts
- AND user can log purchases to decrement balances

#### Scenario: OCR benefit statement scanning
- GIVEN the user has a printed benefit statement
- WHEN user photographs the statement
- THEN OCR extracts benefit amounts
- AND user confirms/corrects extracted values

### Requirement: Benefits Expiration Alerts

The system SHALL notify users of expiring benefits.

#### Scenario: Benefits expiring soon
- GIVEN the user has unused benefits
- AND the benefit period ends within 5 days
- WHEN the app is opened or at scheduled time
- THEN a notification alerts user of expiring benefits
- AND shows which categories have unused amounts

#### Scenario: Customizable alert threshold
- GIVEN the user is in notification settings
- WHEN user adjusts expiration alert timing
- THEN alerts trigger at user-specified days before expiration
- AND user can enable/disable specific category alerts

### Requirement: Benefits Refresh

The system SHALL keep benefits data current.

#### Scenario: Automatic refresh
- GIVEN the user has eWIC integration enabled
- WHEN the app is opened after 1+ hours since last sync
- THEN benefits are automatically refreshed in background
- AND UI updates when new data arrives

#### Scenario: Manual refresh
- GIVEN the user is viewing benefits
- WHEN the user pulls down to refresh
- THEN a sync is triggered immediately
- AND loading indicator shows sync progress
- AND last updated timestamp refreshes

#### Scenario: New benefit period
- GIVEN a new benefit period has started
- WHEN benefits are refreshed
- THEN new period's benefits are displayed
- AND previous period's unused benefits are archived
- AND user is notified of new benefits available

### Requirement: Benefit State Tracking (Available → In Cart → Consumed)

The system MUST clearly differentiate between available benefits, benefits queued in shopping cart, and benefits that have been consumed/processed.

#### Scenario: Three-state benefit display
- WHEN viewing a benefit category
- THEN the display shows three distinct states:
  ```
  Milk - Maria (Postpartum)
  ┌─────────────────────────────────────┐
  │ ████████░░░░░░░░░░░░ │
  │ Consumed  In Cart  Available        │
  │    2 gal   1 gal    1 gal           │
  │ (purchased) (pending) (can add)     │
  └─────────────────────────────────────┘
  Allocated: 4 gal | Period ends: Jan 31
  ```

#### Scenario: Add item to cart reserves benefit
- GIVEN user scans a WIC-eligible product
- WHEN user adds product to shopping cart
- THEN the benefit amount moves from "Available" to "In Cart"
- AND visual indicator shows pending/queued status (yellow/amber)
- AND user cannot over-allocate beyond available amount

#### Scenario: In-cart benefit display
- GIVEN items are in shopping cart
- WHEN viewing benefits overview
- THEN "In Cart" amounts are clearly distinguished with:
  - Different color (amber/yellow vs green for available)
  - "Pending" or "In Cart" label
  - Icon indicating queued status (shopping cart icon)
- AND tooltip explains "Will be consumed when you checkout"

#### Scenario: Remove item from cart restores benefit
- GIVEN an item is in the shopping cart
- WHEN user removes item from cart
- THEN the benefit amount moves from "In Cart" back to "Available"
- AND benefit display updates immediately

#### Scenario: Checkout confirms benefit consumption
- GIVEN items are in shopping cart
- WHEN user marks shopping trip as complete (checkout)
- THEN all "In Cart" benefits move to "Consumed" state
- AND benefits are decremented from actual balance
- AND transaction is logged with timestamp and items
- AND for manual entry users, balances are permanently reduced

#### Scenario: Abandon cart restores all benefits
- GIVEN items are in shopping cart
- WHEN user abandons/clears cart without checkout
- THEN all "In Cart" amounts return to "Available"
- AND confirmation prompt warns user before clearing

#### Scenario: Cart timeout warning
- GIVEN items have been in cart for extended period (configurable)
- WHEN timeout threshold is reached
- THEN user receives notification to complete or clear cart
- AND visual indicator shows stale cart items
- AND user can extend session or clear cart

#### Scenario: Benefit shortage warning during scan
- GIVEN available benefits are low
- AND user scans a product that would exceed available amount
- WHEN scan result displays
- THEN warning shows insufficient benefits:
  ```
  ⚠️ Milk (1 gal)
  You only have 0.5 gal available
  (1 gal already in cart)
  [Add Anyway - Partial] [Don't Add]
  ```

## Data Requirements

### Benefits Data Fields

- Participant ID/Name
- Benefit period start/end dates
- Per-category allocations:
  - Category name
  - Allocated amount (quantity or dollar value)
  - Consumed amount (already purchased)
  - In-cart amount (pending in current session)
  - Available amount (can still add to cart)
  - Unit of measure
  - Last updated timestamp
- Transaction history (if available)
- Active cart session ID

### Household Data Fields

- Household ID
- Household name (optional, e.g., "Johnson Family")
- Participants array:
  - Participant ID
  - Display name
  - Participant type (pregnant, postpartum, breastfeeding, infant, child)
  - Birth date (for infants/children)
  - Benefits linked to participant
- eWIC card last 4 digits (for display)
- Primary state

### Cart Session Data Fields

- Session ID
- Household ID
- Created timestamp
- Last activity timestamp
- Status (active, completed, abandoned)
- Items in cart:
  - Product UPC
  - Product name
  - Participant ID (whose benefit it uses)
  - Benefit category
  - Quantity/amount
  - Added timestamp
- Store ID (where shopping)

### State eWIC Integration

Priority states for initial launch:
- **Michigan** - FIS processor
- **North Carolina** - Conduent processor
- **Florida** - FIS processor
- **Oregon** - State-specific system

Support for major eWIC processors:
- FIS
- Conduent
- Xerox
- State-specific systems
- Fallback to manual entry if API unavailable

## Privacy Requirements

- Benefits data stored encrypted at rest
- No benefits data transmitted without user consent
- Option to use app without linking real benefits (demo mode)
- Clear data deletion option

