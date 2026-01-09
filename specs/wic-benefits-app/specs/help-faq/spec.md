# Help & FAQ Specification

## Purpose

Provide users with easily accessible help content and frequently asked questions that address WIC-specific rules, common confusion points, and app usage guidance.

## Requirements

### Requirement: FAQ Content

The system SHALL provide comprehensive FAQ content addressing common WIC questions.

#### Scenario: Access FAQ from any screen
- GIVEN the user needs help
- WHEN user taps help icon (?) or navigates to Help
- THEN FAQ section is easily accessible
- AND search functionality is available
- AND categories organize common questions

#### Scenario: Contextual FAQ
- GIVEN the user is on a specific screen (e.g., scanning)
- WHEN user taps help
- THEN relevant FAQs for that feature are shown first
- AND general FAQs are still accessible

### Requirement: WIC Rules & Requirements FAQs

The system SHALL explain critical WIC eligibility rules that cause common confusion.

#### Scenario: Size requirements FAQ
- WHEN user views size requirements FAQ
- THEN content explains:
  ```
  Why does size matter for WIC?

  WIC benefits specify EXACT sizes for many products.
  For example:

  ❌ 11.5 oz formula - NOT covered
  ✓ 12.4 oz formula - Covered

  ❌ 15 oz cereal - NOT covered
  ✓ 16 oz cereal - Covered

  Even if a product is the right type and brand,
  the wrong size will be rejected at checkout.

  💡 Tip: Always check the size shown in your
  scan results matches what's on the shelf.
  ```

#### Scenario: Formula-specific FAQ
- WHEN user views formula FAQ
- THEN content explains:
  ```
  Infant Formula Rules

  Formula has the STRICTEST requirements:

  1. CONTRACT BRAND ONLY (unless medical exception)
     Your state has a contract with one brand.
     • Michigan: Similac
     • North Carolina: Enfamil
     • Florida: Similac
     • Oregon: Similac

  2. EXACT SIZE REQUIRED
     • 12.4 oz powder - Covered
     • 12.5 oz powder - NOT covered

  3. CORRECT FORM
     • Powder, Concentrate, or Ready-to-Feed
     • Must match what's on your benefits

  4. SPECIAL FORMULAS
     Need a doctor's prescription for:
     • Soy formula
     • Hypoallergenic
     • Other specialty formulas

  ⚠️ If your store is out of your formula,
  use our Formula Finder to check other stores.
  ```

#### Scenario: Brand restrictions FAQ
- WHEN user views brand restrictions FAQ
- THEN content explains:
  ```
  Why can't I get any brand?

  WIC approves specific brands for each product:

  MILK: Usually any brand ✓
  EGGS: Usually any brand ✓
  CHEESE: Specific brands only
  CEREAL: Approved list (check sugar content)
  JUICE: 100% juice, specific brands
  FORMULA: Contract brand ONLY

  Our app only shows you products that are
  approved in YOUR state. If you scan something
  and it says "Not Eligible," the brand or
  size isn't on your state's approved list.
  ```

#### Scenario: Package vs unit size FAQ
- WHEN user views package size FAQ
- THEN content explains:
  ```
  Package Size vs Unit Size

  Be careful! WIC cares about the UNIT size,
  not the total package:

  Example - Yogurt:
  ✓ 4-pack of 4oz cups (4oz per unit)
  ❌ 4-pack of 6oz cups (6oz per unit)

  Example - Cheese:
  ✓ 16 oz block
  ❌ Two 8 oz blocks (even though = 16 oz)

  💡 When in doubt, scan it! Our app checks
  the exact UPC against your state's list.
  ```

### Requirement: Checkout & Payment FAQs

The system SHALL explain WIC checkout procedures.

#### Scenario: Checkout process FAQ
- WHEN user views checkout FAQ
- THEN content explains:
  ```
  How WIC Checkout Works

  1. SEPARATE YOUR ITEMS
     Keep WIC items separate from non-WIC items

  2. TELL THE CASHIER
     Say "I'm using WIC" before they start

  3. SCAN YOUR CARD FIRST
     eWIC card should be swiped/inserted first

  4. WATCH THE SCREEN
     The register shows which items are covered

  5. IF SOMETHING IS REJECTED
     • Wrong size or brand
     • Already used that benefit
     • Item not in your state's list

     You can: Remove it, swap for correct item,
     or pay cash/card for it

  💡 Use our app's Cart Checkout feature to
  mark items as purchased and track your
  remaining benefits.
  ```

#### Scenario: Item rejected at register FAQ
- WHEN user views rejection FAQ
- THEN content explains:
  ```
  Why Was My Item Rejected?

  Common reasons WIC items get rejected:

  1. WRONG SIZE
     12.4 oz ≠ 12.5 oz (must be exact)

  2. WRONG BRAND
     Store brand vs. approved brand

  3. BENEFIT ALREADY USED
     You already bought that category this month

  4. WRONG TYPE
     2% milk when benefits say "whole milk"

  5. PRODUCT NOT IN STATE LIST
     Approved products vary by state

  6. EXPIRED BENEFITS
     Benefits from previous month

  💡 Scan before you shop! Our app tells
  you exactly what's covered.
  ```

### Requirement: Benefits Understanding FAQs

The system SHALL explain how WIC benefits work.

#### Scenario: Benefits period FAQ
- WHEN user views benefits period FAQ
- THEN content explains:
  ```
  Understanding Your Benefits Period

  WIC benefits work on a monthly cycle:

  • Benefits are issued on your START DATE
  • Benefits EXPIRE on your END DATE
  • Unused benefits do NOT roll over

  Example:
  Start: January 1
  End: January 31
  If you don't use your 4 gallons of milk
  by Jan 31, they're gone.

  ⚠️ We'll send you reminders when benefits
  are about to expire!
  ```

#### Scenario: Participant categories FAQ
- WHEN user views participant FAQ
- THEN content explains:
  ```
  WIC Participant Categories

  Benefits depend on who's enrolled:

  PREGNANT WOMEN
  • Milk, eggs, cheese, whole grains
  • Fruits & vegetables (CVV)
  • No infant items

  POSTPARTUM (up to 6 months)
  • Similar to pregnant
  • Smaller quantities

  BREASTFEEDING
  • Larger food quantities
  • May get less/no formula

  INFANTS (0-12 months)
  • Formula (or less if breastfeeding)
  • Baby food (starting at 6 months)
  • Infant cereal

  CHILDREN (1-5 years)
  • Milk (whole until age 2, then lower fat)
  • Eggs, cheese, cereals
  • Fruits & vegetables

  Your app shows benefits for each person
  in your household separately.
  ```

### Requirement: App Usage FAQs

The system SHALL provide guidance on using the app effectively.

#### Scenario: Scanning tips FAQ
- WHEN user views scanning tips FAQ
- THEN content explains:
  ```
  Tips for Better Scanning

  1. GOOD LIGHTING
     Make sure the barcode is well-lit

  2. STEADY HAND
     Hold phone 4-6 inches from barcode

  3. FLAT BARCODE
     Smooth out wrinkled packaging

  4. CLEAN LENS
     Wipe your camera lens

  5. MANUAL ENTRY
     If scan won't work, tap "Enter Manually"
     and type the numbers below the barcode

  💡 The barcode usually has 12 digits
  starting with 0 (UPC-A format)
  ```

#### Scenario: Cart vs actual purchase FAQ
- WHEN user views cart explanation FAQ
- THEN content explains:
  ```
  In Cart vs Actually Purchased

  🛒 IN CART (Yellow/Amber)
  Items you've scanned and plan to buy.
  Benefits are "reserved" but not used yet.

  ✓ PURCHASED (Gray)
  Items you've checked out with.
  Benefits are permanently used.

  Why does this matter?
  • "In Cart" helps you plan your trip
  • Benefits aren't deducted until checkout
  • If you put something back, remove it
    from your cart to free up benefits

  Remember: After paying at the register,
  tap "Checkout" in the app to update
  your benefits.
  ```

#### Scenario: Offline mode FAQ
- WHEN user views offline FAQ
- THEN content explains:
  ```
  Using the App Without Internet

  📱 WHAT WORKS OFFLINE:
  • Scanning products
  • Checking eligibility (cached data)
  • Viewing your benefits (last sync)
  • Adding items to cart

  📵 WHAT NEEDS INTERNET:
  • Syncing latest benefits balance
  • Real-time store inventory
  • Completing checkout
  • Searching for stores

  💡 We download your state's product list
  so scanning works even in store "dead zones"
  ```

### Requirement: FAQ Search

The system SHALL allow searching FAQ content.

#### Scenario: Search FAQs
- GIVEN user has a specific question
- WHEN user types in FAQ search
- THEN matching questions and answers appear
- AND results are ranked by relevance
- AND search includes content within answers

#### Scenario: No search results
- GIVEN user searches for uncommon term
- WHEN no FAQs match
- THEN "No results found" message appears
- AND suggested related topics are shown
- AND option to contact support appears

### Requirement: Quick Help Tooltips

The system SHALL provide contextual help throughout the app.

#### Scenario: First-time feature tooltip
- GIVEN user accesses a feature for first time
- WHEN feature loads
- THEN brief tooltip explains key function
- AND tooltip can be dismissed
- AND "Don't show again" option available

#### Scenario: Info icons on complex fields
- GIVEN a screen has WIC-specific terminology
- WHEN user taps (i) icon next to term
- THEN brief explanation popover appears
- AND links to full FAQ if available

## Data Requirements

### FAQ Content Structure

```typescript
interface FAQCategory {
  id: string;
  name: string;
  icon: string;
  order: number;
  questions: FAQQuestion[];
}

interface FAQQuestion {
  id: string;
  question: string;
  answer: string;  // Supports markdown
  keywords: string[];  // For search
  relatedScreens: string[];  // For contextual display
  relatedQuestions: string[];  // FAQ IDs
  lastUpdated: Date;
}
```

### FAQ Categories

1. **WIC Basics** - What is WIC, eligibility, enrollment
2. **Product Rules** - Sizes, brands, types, restrictions
3. **Formula** - Contract brands, sizes, special formulas
4. **Benefits** - Periods, categories, expiration
5. **Shopping** - Scanning, checkout, store tips
6. **Using the App** - Features, cart, offline mode
7. **Troubleshooting** - Common issues, error messages

### State-Specific Content

- Contract formula brand by state
- State-specific approved product variations
- Local WIC office contact information
- State-specific rules and exceptions

## Accessibility Requirements

- FAQ content readable by screen readers
- Search results announced
- Tooltips accessible via keyboard/focus
- High contrast support for all help content

