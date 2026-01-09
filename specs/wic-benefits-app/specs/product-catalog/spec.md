# Product Catalog Specification

## Purpose

Present WIC-eligible products in an organized, browsable hierarchy that makes it easy for users to discover available products by category and subcategory.

## Requirements

### Requirement: Category Hierarchy

The system SHALL organize products in a logical category/subcategory structure.

#### Scenario: Browse top-level categories
- WHEN the user opens product browsing
- THEN main categories are displayed:
  - Dairy
  - Grains & Cereals
  - Fruits & Vegetables
  - Proteins
  - Juice
  - Infant & Baby
- AND each category shows product count available at current store

#### Scenario: Browse subcategories
- GIVEN the user selects "Dairy" category
- WHEN the subcategory list appears
- THEN subcategories include:
  - Milk
  - Cheese
  - Yogurt
- AND each shows count and benefit allowance remaining

### Requirement: Dairy Category Structure

The system SHALL organize dairy products with clear subcategories.

#### Scenario: Milk subcategory
- WHEN viewing Milk products
- THEN products are grouped by:
  - Type (Whole, 2%, 1%, Skim, Lactose-Free)
  - Size (Gallon, Half-gallon, Quart)
  - Brand (if relevant to eligibility)
- AND only WIC-eligible options for user's state are shown

#### Scenario: Cheese subcategory
- WHEN viewing Cheese products
- THEN products are grouped by:
  - Type (Block, Sliced, Shredded, String)
  - Variety (American, Cheddar, Mozzarella, etc.)
- AND package sizes meeting WIC requirements are shown

#### Scenario: Yogurt subcategory
- WHEN viewing Yogurt products
- THEN products are grouped by:
  - Type (Regular, Greek, Drinkable)
  - Size (Single serve, Multi-pack, Large container)
- AND sugar content limits per state are enforced

### Requirement: Grains & Cereals Category

The system SHALL organize grain products appropriately.

#### Scenario: Cereal subcategory
- WHEN viewing Cereal products
- THEN products are grouped by:
  - Type (Hot cereal, Cold cereal)
  - Brand eligibility
- AND sugar/fiber requirements per state are enforced

#### Scenario: Bread subcategory
- WHEN viewing Bread products
- THEN products are grouped by:
  - Type (Whole wheat, Whole grain)
  - Size (Loaf size requirements)

#### Scenario: Rice/Pasta subcategory
- WHEN viewing Rice and Pasta
- THEN products show:
  - Whole grain options
  - Package sizes meeting requirements

### Requirement: Infant & Baby Category

The system SHALL provide comprehensive infant product organization.

#### Scenario: Infant Formula subcategory
- WHEN viewing Infant Formula
- THEN products are organized by:
  - Contract brand (state-specific)
  - Type (Milk-based, Soy, Specialty)
  - Form (Powder, Concentrate, Ready-to-feed)
  - Size
- AND contract brand is highlighted as primary option
- AND availability status is prominently shown

#### Scenario: Baby Food subcategory
- WHEN viewing Baby Food
- THEN products are organized by:
  - Stage (1, 2, 3)
  - Type (Fruits, Vegetables, Meats, Mixed)
- AND eligible brands are clearly marked

#### Scenario: Infant Cereal subcategory
- WHEN viewing Infant Cereal
- THEN products show eligible brands and types

### Requirement: Product Filtering

The system SHALL allow filtering within categories.

#### Scenario: Filter by availability
- GIVEN the user is browsing a category
- WHEN user toggles "In Stock Only"
- THEN only products available at current store are shown
- AND out-of-stock items are hidden

#### Scenario: Filter by brand
- GIVEN the user prefers certain brands
- WHEN user selects brand filter
- THEN only selected brands are displayed
- AND count updates to reflect filter

#### Scenario: Filter by remaining benefits
- GIVEN the user wants to see purchasable items
- WHEN user toggles "Can Buy Now"
- THEN only products within remaining benefit amounts are shown
- AND items exceeding allowance are hidden

### Requirement: Product Details

The system SHALL display comprehensive product information.

#### Scenario: View product detail
- WHEN user taps on a product
- THEN detail view shows:
  - Product name and brand
  - Product image
  - Size/quantity
  - WIC eligibility confirmation
  - Benefit category it applies to
  - Stock status at current store
  - Aisle location (if available)
  - Similar alternatives

#### Scenario: Add to shopping list
- GIVEN user is viewing a product
- WHEN user taps "Add to List"
- THEN product is added to shopping list
- AND benefits calculator updates

### Requirement: Search Within Catalog

The system SHALL support product search.

#### Scenario: Search by product name
- WHEN user searches "greek yogurt"
- THEN matching WIC-eligible products appear
- AND results show availability at current store

#### Scenario: Search with no results
- WHEN user searches for non-WIC product
- THEN "No WIC-eligible matches" message appears
- AND suggestions for similar eligible products shown

## Data Requirements

### Category Structure

```
Dairy
├── Milk
│   ├── Whole Milk
│   ├── 2% Reduced Fat
│   ├── 1% Low Fat
│   ├── Skim/Fat Free
│   └── Lactose-Free
├── Cheese
│   ├── Block Cheese
│   ├── Sliced Cheese
│   ├── Shredded Cheese
│   └── String Cheese
└── Yogurt
    ├── Regular Yogurt
    ├── Greek Yogurt
    └── Drinkable Yogurt

Grains & Cereals
├── Cereal
│   ├── Hot Cereal
│   └── Cold Cereal
├── Bread
│   └── Whole Wheat/Grain
├── Rice
│   └── Brown/Whole Grain
├── Pasta
│   └── Whole Grain
└── Tortillas
    └── Whole Wheat/Corn

Fruits & Vegetables
├── Fresh Produce
├── Frozen (no added ingredients)
└── Canned (limited eligibility)

Proteins
├── Eggs
├── Peanut Butter
├── Beans & Legumes
│   ├── Dried Beans
│   └── Canned Beans
├── Canned Fish
└── Tofu

Juice
├── 100% Fruit Juice
└── 100% Vegetable Juice

Infant & Baby
├── Infant Formula
│   ├── Contract Brand
│   └── Alternative Brands
├── Baby Food
│   ├── Fruits
│   ├── Vegetables
│   ├── Meats
│   └── Mixed
└── Infant Cereal
```

### Product Data Fields

- UPC
- Product name
- Brand
- Category path (array)
- Size/quantity
- Image URL
- Eligible states (array)
- Participant type restrictions
- Nutritional requirements met (sugar, fiber, etc.)

