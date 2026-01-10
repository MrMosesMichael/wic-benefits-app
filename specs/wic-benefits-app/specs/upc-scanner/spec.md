# UPC Scanner Specification

## Purpose

Enable WIC participants to scan product barcodes and instantly determine WIC eligibility for their state.

## Goals and Objectives

### Business Goals
- Reduce shopping stress and uncertainty for WIC participants by providing instant, accurate product eligibility information
- Minimize checkout rejections by helping participants verify products before reaching the register
- Increase WIC benefit utilization rates by making it easier to identify eligible products
- Support program compliance by ensuring participants purchase only approved products

### User Goals
- Quickly determine if a product is WIC-eligible before placing it in their cart
- Avoid embarrassment at checkout from rejected items
- Shop confidently without constantly asking store staff for help
- Save time by scanning products while shopping rather than guessing
- Understand which household member can use the scanned product

### Success Metrics
- Barcode scan success rate > 95% on first attempt
- Average scan-to-result time < 2 seconds
- Eligibility determination accuracy > 99% (matches state APL)
- User adoption: > 70% of active users scan at least one product per shopping trip
- Reduction in checkout issues: 50% fewer rejected items for app users vs non-users

## Non-Functional Requirements

### Performance
- Barcode detection and decode: < 500ms
- Eligibility lookup (online): < 1 second
- Eligibility lookup (offline, cached APL): < 100ms
- App remains responsive during scanning (no UI freezing)
- Scanner can process consecutive scans without lag

### Security
- No product scan history transmitted to third parties
- Scan history encrypted at rest on device
- Camera access used only for barcode scanning (no photo storage)
- State APL data cached locally with integrity verification
- Secure API calls for product lookups with certificate pinning

### Usability
- Camera viewfinder works in varying lighting conditions (bright store lights, dim aisles)
- Works with damaged or partially obscured barcodes when possible
- Clear visual feedback when barcode is detected and recognized
- Manual entry option for accessibility and barcode scanning failures
- Multi-language support for scan results (English, Spanish minimum)
- Screen reader announces eligibility results clearly

### Reliability
- Graceful degradation when network unavailable (use cached APL)
- Handles poor connectivity in stores (retry logic, timeout handling)
- Works with all standard barcode formats (UPC-A, UPC-E, EAN-13)
- Recovers from camera errors without app crash
- APL data syncs automatically and handles version updates

### Error Handling
- Clear message when camera permission denied: "Allow camera access to scan barcodes"
- Unknown product: "Product not found. Try entering UPC manually or report this product"
- Network error: "Using offline data from [date]. Connect for latest updates"
- Invalid barcode: "Couldn't read barcode. Try manual entry or better lighting"
- Ambiguous eligibility: "Eligible for [participant types]. Not eligible for [others]"

## Technical Requirements

### Platform Compatibility
- iOS 14.0+ (supports iPhone 8 and newer)
- Android 8.0+ (API level 26+)
- React Native 0.72+
- Camera API: react-native-camera or expo-camera
- Works on devices with rear-facing camera (front camera optional)

### Dependencies
- Barcode scanning library: react-native-camera or ML Kit (Google) / VisionKit (Apple)
- Supported formats: UPC-A, UPC-E, EAN-13, EAN-8
- State APL API: RESTful API with JSON responses
- Product database API: Third-party product data provider (e.g., UPCitemdb, USDA)
- Offline storage: SQLite for cached APL data (50-100 MB per state)

### Data Storage
- Local APL cache: Encrypted SQLite database (one per state)
- Scan history: Local storage with optional cloud backup
- Cache invalidation: Check for APL updates on app launch and daily background sync
- Privacy: Scan history stored locally only, not transmitted unless user opts in
- Data retention: Scan history kept for 90 days, then auto-deleted

### Integration Requirements
- State WIC APL APIs: Direct integration with state databases for real-time eligibility (where available)
- Fallback APL source: USDA FNS WIC APL aggregator or state-maintained CSV files
- Product database: UPC lookup service for product name, brand, size, image
- eWIC processor integration: FIS, Conduent, Xerox APIs for benefit balance (future)
- Analytics: Privacy-preserving usage metrics (scan success rate, eligibility hit rate)

## Requirements

### Requirement: Barcode Scanning

The system SHALL support scanning of standard retail barcodes to identify products.

#### Scenario: Scan UPC-A barcode
- GIVEN the user has camera access enabled
- WHEN the user points camera at a UPC-A barcode
- THEN the barcode is decoded quickly
- AND the product lookup begins automatically

#### Scenario: Scan UPC-E barcode
- GIVEN the user has camera access enabled
- WHEN the user points camera at a UPC-E (compressed) barcode
- THEN the barcode is decoded and expanded to full UPC
- AND the product lookup begins automatically

#### Scenario: Scan EAN-13 barcode
- GIVEN the user has camera access enabled
- WHEN the user points camera at an EAN-13 barcode (international)
- THEN the barcode is decoded quickly
- AND the product lookup begins automatically

#### Scenario: Manual UPC entry
- GIVEN the user cannot scan a barcode (damaged, obscured)
- WHEN the user taps "Enter manually"
- THEN a numeric keypad appears
- AND the user can type the UPC digits
- AND validation occurs on submission

### Requirement: WIC Eligibility Lookup

The system SHALL determine WIC eligibility based on the user's registered state.

#### Scenario: Product is WIC eligible
- GIVEN the user has set their state to "California"
- AND the scanned product is on California's APL
- WHEN the lookup completes
- THEN the result shows "WIC Eligible" with green indicator
- AND displays the product name, size, and brand
- AND shows which benefit category it applies to (e.g., "Milk - 1 gallon")
- AND shows remaining benefit amount for that category
- AND displays "Add to Cart" button

#### Scenario: Product is not WIC eligible
- GIVEN the user has set their state
- AND the scanned product is NOT on that state's APL
- WHEN the lookup completes
- THEN the result shows "Not WIC Eligible" with red indicator
- AND displays the product name if known
- AND optionally suggests a similar WIC-eligible alternative
- AND no "Add to Cart" option is shown

#### Scenario: Product eligibility varies by participant type
- GIVEN the scanned product is eligible only for certain participants
- WHEN the lookup completes
- THEN the result indicates participant restrictions
- AND shows "Eligible for: Infants 0-5 months" or similar
- AND "Add to Cart" only appears if eligible participant exists in household

#### Scenario: Unknown product
- GIVEN the scanned UPC is not in the product database
- WHEN the lookup completes
- THEN the result shows "Product not found"
- AND offers option to report/add the product

### Requirement: Scan Modes (Check vs Shop)

The system SHALL support two distinct scanning modes to differentiate between checking eligibility and actively shopping.

#### Scenario: Default scan mode is "Check Eligibility"
- GIVEN the user opens the scanner
- WHEN no mode is explicitly selected
- THEN default mode is "Check Eligibility"
- AND scanning shows eligibility result only
- AND user must explicitly tap "Add to Cart" to add items
- AND result screen stays visible until dismissed

#### Scenario: Toggle to "Shopping Mode"
- GIVEN the user is actively shopping
- WHEN user toggles to "Shopping Mode"
- THEN scanner behavior changes to streamlined add-to-cart flow
- AND mode indicator shows "Shopping Mode" badge
- AND scanned eligible items prompt for cart addition

#### Scenario: Mode persistence
- GIVEN user has selected a scan mode
- WHEN user navigates away and returns
- THEN previous mode selection is preserved for session
- AND mode resets to "Check Eligibility" on app restart

### Requirement: Eligibility Check (No Cart Action)

The system SHALL allow users to scan products purely to check WIC eligibility without any cart interaction.

#### Scenario: Scan to check eligibility only
- GIVEN user is in "Check Eligibility" mode (default)
- WHEN user scans a product
- THEN eligibility result displays:
  ```
  ✓ WIC Eligible

  Whole Milk - Great Value
  1 gallon

  Category: Milk
  Your benefits: 4 gal available

  [Add to Cart]  [Scan Another]  [Done]
  ```
- AND no automatic cart action occurs
- AND user can dismiss result and continue browsing

#### Scenario: Check eligibility for product user won't buy
- GIVEN user scans a product just to verify eligibility
- WHEN result shows eligible
- AND user decides not to get this product
- THEN user taps "Scan Another" or "Done"
- AND no cart or benefit changes occur
- AND user continues shopping or exits scanner

### Requirement: Explicit Add to Cart Confirmation

The system SHALL require explicit user confirmation before adding any item to cart and reserving benefits.

#### Scenario: Confirm before adding to cart
- GIVEN a scan result shows WIC eligible
- WHEN user taps "Add to Cart"
- THEN confirmation prompt appears:
  ```
  Add to Cart?

  Whole Milk (1 gal)
  This will reserve 1 gal from your
  Milk benefits until checkout.

  [Cancel]  [Yes, Add to Cart]
  ```
- AND user must confirm to proceed
- AND benefit only moves to "In Cart" after confirmation

#### Scenario: Skip confirmation preference
- GIVEN user finds confirmations repetitive
- WHEN user enables "Skip add confirmations" in settings
- THEN "Add to Cart" tap adds immediately without prompt
- AND brief undo toast appears instead
- AND user can re-enable confirmations anytime

#### Scenario: Add single-participant eligible product
- GIVEN user confirms adding product to cart
- AND only one household participant can use this benefit
- WHEN confirmation is accepted
- THEN product is added to cart for that participant
- AND benefit amount moves from "Available" to "In Cart"
- AND success confirmation with cart count is shown
- AND scanner remains active for next scan

#### Scenario: Add multi-participant eligible product
- GIVEN a scanned product is WIC eligible
- AND multiple household participants can use this benefit
- WHEN user taps "Add to Cart"
- THEN participant selection appears:
  ```
  Add Whole Milk (1 gal) for:

  ○ Maria (4 gal available)
  ○ Diego (3 gal available)

  This will reserve benefits for the
  selected participant until checkout.

  [Cancel] [Add to Cart]
  ```
- AND user selects which participant
- AND product is added to that participant's cart allocation

#### Scenario: Add product with quantity selection
- GIVEN a scanned product allows multiple quantities (e.g., eggs)
- WHEN user taps "Add to Cart"
- THEN quantity selector appears
- AND maximum is limited to available benefit amount
- AND confirmation shows total benefit impact
- AND user confirms quantity to add

#### Scenario: Add product exceeding available benefits
- GIVEN a scanned product is WIC eligible
- AND user has insufficient remaining benefits (Available - In Cart)
- WHEN scan result displays
- THEN warning indicator shows:
  ```
  ⚠️ Whole Milk (1 gal)
  WIC Eligible but insufficient benefits
  Available: 0.5 gal (1.5 gal already in cart)

  [Add Partial (0.5 gal)] [View Cart] [Cancel]
  ```

#### Scenario: Scan product already in cart
- GIVEN a product is already in the shopping cart
- WHEN the same product is scanned again
- THEN result shows "Already in Cart" indicator
- AND displays current cart quantity and for which participant
- AND offers "Add Another" only if benefits allow
- AND shows "Remove from Cart" option

### Requirement: Quick Shopping Mode (Optional)

The system SHALL offer an expedited mode for users who want faster cart additions.

#### Scenario: Enable quick shopping mode
- GIVEN user is in "Shopping Mode"
- AND user enables "Quick Add" toggle
- WHEN eligible product is scanned
- THEN product is automatically added to cart (default participant if multiple)
- AND brief toast confirmation appears with undo option
- AND scanner immediately ready for next scan

#### Scenario: Quick mode undo
- GIVEN an item was auto-added in quick mode
- WHEN user taps "Undo" shortly after
- THEN item is removed from cart
- AND benefit returns to "Available"
- AND confirmation shows removal

#### Scenario: Quick mode with multiple participants
- GIVEN quick mode is enabled
- AND multiple participants could use the benefit
- WHEN product is scanned
- THEN item is added to default/primary participant
- OR participant selection still appears (user preference)

### Requirement: Scan Result Actions

The system SHALL provide contextual actions on scan results.

#### Scenario: View product in catalog
- GIVEN a scan result is displayed
- WHEN user taps "View Details"
- THEN full product detail screen opens
- AND shows stock status at current store
- AND shows aisle location if available

#### Scenario: Find similar products
- GIVEN a product is not eligible or out of stock
- WHEN user taps "Find Similar"
- THEN list of similar WIC-eligible alternatives appears
- AND sorted by availability at current store

#### Scenario: Check other stores
- GIVEN a scanned product is out of stock
- WHEN user taps "Check Other Stores"
- THEN nearby stores with stock are displayed
- AND sorted by distance

### Requirement: Offline Scanning

The system MUST support offline barcode scanning with cached eligibility data.

#### Scenario: Scan while offline with cached data
- GIVEN the device has no network connectivity
- AND the user's state APL was previously downloaded
- WHEN the user scans a barcode
- THEN the lookup uses cached data
- AND displays result with "Offline - data from [date]" indicator

#### Scenario: Scan while offline without cached data
- GIVEN the device has no network connectivity
- AND no APL data is cached
- WHEN the user scans a barcode
- THEN the system queues the lookup
- AND displays "Will check when online"
- AND notifies user when result is available

### Requirement: Scan History

The system SHALL maintain a history of scanned products.

#### Scenario: View scan history
- WHEN the user navigates to scan history
- THEN recent scans are displayed in reverse chronological order
- AND each entry shows product name, eligibility result, and timestamp

#### Scenario: Re-check scanned product
- GIVEN the user is viewing scan history
- WHEN the user taps a previous scan
- THEN the current eligibility is re-checked
- AND the result is updated if changed

## Data Requirements

### UPC Database

- Coverage: Minimum 95% of products sold at WIC-authorized retailers
- Updates: Weekly sync with manufacturer databases
- Fields: UPC, product name, brand, size, category, image URL

### State APL (Approved Product List)

- Coverage: All 50 states + DC + territories
- Updates: Promptly after state APL changes
- Fields: UPC, eligibility status, size restrictions, participant restrictions, benefit category

## Accessibility Requirements

- VoiceOver/TalkBack support for scan results
- Haptic feedback on successful scan
- High contrast eligibility indicators
- Audio announcement of eligibility result
