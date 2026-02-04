-- Migration 018: Multi-State APL Expansion
-- Adds sample APL data for NC, FL, OR, NY
-- Note: This is sample data for development/testing. Production should use official state APL files.

-- Ensure state index exists
CREATE INDEX IF NOT EXISTS idx_apl_products_state ON apl_products(state);

-- Common WIC products that are typically approved across all states
-- These products represent major national brands commonly found in WIC programs

-- =====================================================
-- NORTH CAROLINA (NC) - Sample APL Data
-- =====================================================

INSERT INTO apl_products (upc, product_name, brand, size, category, subcategory, state, active)
VALUES
-- Milk
('070038360605', 'Vitamin D Milk', 'Kroger', '1 gal', 'milk', 'whole', 'NC', true),
('011110406958', '2% Reduced Fat Milk', 'Great Value', '1 gal', 'milk', 'reduced_fat', 'NC', true),
('041130428142', 'Fat Free Milk', 'Harris Teeter', '1 gal', 'milk', 'fat_free', 'NC', true),
-- Eggs
('041130429319', 'Grade A Large Eggs', 'Harris Teeter', '1 dozen', 'eggs', 'large', 'NC', true),
('070038375202', 'Large White Eggs', 'Simple Truth', '1 dozen', 'eggs', 'large', 'NC', true),
-- Cereal
('016000275287', 'Cheerios', 'General Mills', '12 oz', 'cereal', 'whole_grain', 'NC', true),
('038000786730', 'Rice Krispies', 'Kellogg''s', '12 oz', 'cereal', 'whole_grain', 'NC', true),
('884912129161', 'Corn Flakes', 'Great Value', '18 oz', 'cereal', 'whole_grain', 'NC', true),
-- Peanut Butter
('051500255162', 'Creamy Peanut Butter', 'Jif', '16 oz', 'peanut_butter', 'creamy', 'NC', true),
('044000030827', 'Creamy Peanut Butter', 'Skippy', '16.3 oz', 'peanut_butter', 'creamy', 'NC', true),
-- Juice
('041130424625', '100% Apple Juice', 'Harris Teeter', '64 oz', 'juice', 'apple', 'NC', true),
('014800000023', '100% Orange Juice', 'Minute Maid', '64 oz', 'juice', 'orange', 'NC', true),
-- Cheese
('021000013050', 'American Cheese Singles', 'Kraft', '16 oz', 'cheese', 'american', 'NC', true),
('070038361640', 'Mild Cheddar Cheese Block', 'Kroger', '8 oz', 'cheese', 'cheddar', 'NC', true),
-- Whole Grains
('050000009909', 'Whole Wheat Bread', 'Nature''s Own', '20 oz', 'whole_grains', 'bread', 'NC', true),
('072220008761', 'Soft Corn Tortillas', 'Mission', '30 ct', 'whole_grains', 'tortillas', 'NC', true),
-- Infant Formula
('300875121030', 'Similac Pro-Advance', 'Abbott', '12.4 oz', 'infant_formula', 'standard', 'NC', true),
('300871239265', 'Similac Sensitive', 'Abbott', '12.5 oz', 'infant_formula', 'sensitive', 'NC', true),
('300875121191', 'Enfamil NeuroPro', 'Mead Johnson', '12.5 oz', 'infant_formula', 'standard', 'NC', true)
ON CONFLICT (upc) DO UPDATE SET state = 'NC', active = true;

-- =====================================================
-- FLORIDA (FL) - Sample APL Data
-- =====================================================

INSERT INTO apl_products (upc, product_name, brand, size, category, subcategory, state, active)
VALUES
-- Milk
('041130005022', 'Vitamin D Milk', 'Publix', '1 gal', 'milk', 'whole', 'FL', true),
('041130004841', '2% Reduced Fat Milk', 'Publix', '1 gal', 'milk', 'reduced_fat', 'FL', true),
('041130004858', 'Fat Free Skim Milk', 'Publix', '1 gal', 'milk', 'fat_free', 'FL', true),
-- Eggs
('041130003974', 'Grade A Large Eggs', 'Publix', '1 dozen', 'eggs', 'large', 'FL', true),
('041130001048', 'Grade AA Large Eggs', 'Publix', '1 dozen', 'eggs', 'large', 'FL', true),
-- Cereal
('016000275287', 'Cheerios', 'General Mills', '12 oz', 'cereal', 'whole_grain', 'FL', true),
('038000786730', 'Rice Krispies', 'Kellogg''s', '12 oz', 'cereal', 'whole_grain', 'FL', true),
('038000000706', 'Frosted Mini-Wheats', 'Kellogg''s', '18 oz', 'cereal', 'whole_grain', 'FL', true),
-- Peanut Butter
('051500255162', 'Creamy Peanut Butter', 'Jif', '16 oz', 'peanut_butter', 'creamy', 'FL', true),
('044000030827', 'Creamy Peanut Butter', 'Skippy', '16.3 oz', 'peanut_butter', 'creamy', 'FL', true),
-- Juice
('041130009143', '100% Apple Juice', 'Publix', '64 oz', 'juice', 'apple', 'FL', true),
('041130008122', '100% Orange Juice', 'Publix', '64 oz', 'juice', 'orange', 'FL', true),
-- Cheese
('021000013050', 'American Cheese Singles', 'Kraft', '16 oz', 'cheese', 'american', 'FL', true),
('041130005701', 'Mild Cheddar Cheese Block', 'Publix', '8 oz', 'cheese', 'cheddar', 'FL', true),
-- Whole Grains
('050000009909', 'Whole Wheat Bread', 'Nature''s Own', '20 oz', 'whole_grains', 'bread', 'FL', true),
('072220001311', 'Whole Wheat Tortillas', 'Mission', '8 ct', 'whole_grains', 'tortillas', 'FL', true),
-- Infant Formula
('300875121030', 'Similac Pro-Advance', 'Abbott', '12.4 oz', 'infant_formula', 'standard', 'FL', true),
('300871239265', 'Similac Sensitive', 'Abbott', '12.5 oz', 'infant_formula', 'sensitive', 'FL', true),
('300875121191', 'Enfamil NeuroPro', 'Mead Johnson', '12.5 oz', 'infant_formula', 'standard', 'FL', true)
ON CONFLICT (upc) DO UPDATE SET state = 'FL', active = true;

-- =====================================================
-- OREGON (OR) - Sample APL Data
-- =====================================================

INSERT INTO apl_products (upc, product_name, brand, size, category, subcategory, state, active)
VALUES
-- Milk
('011110406958', 'Vitamin D Milk', 'Kroger', '1 gal', 'milk', 'whole', 'OR', true),
('011110406965', '2% Reduced Fat Milk', 'Kroger', '1 gal', 'milk', 'reduced_fat', 'OR', true),
('011110406972', 'Fat Free Skim Milk', 'Kroger', '1 gal', 'milk', 'fat_free', 'OR', true),
('036632032379', 'Organic Whole Milk', 'Organic Valley', '1/2 gal', 'milk', 'whole', 'OR', true),
-- Eggs
('070038375202', 'Grade A Large Eggs', 'Simple Truth', '1 dozen', 'eggs', 'large', 'OR', true),
('011110416001', 'Cage Free Large Eggs', 'Kroger', '1 dozen', 'eggs', 'cage_free', 'OR', true),
-- Cereal
('016000275287', 'Cheerios', 'General Mills', '12 oz', 'cereal', 'whole_grain', 'OR', true),
('016000169579', 'Total Whole Grain', 'General Mills', '10.6 oz', 'cereal', 'whole_grain', 'OR', true),
('038000000706', 'Frosted Mini-Wheats', 'Kellogg''s', '18 oz', 'cereal', 'whole_grain', 'OR', true),
-- Peanut Butter
('051500255162', 'Creamy Peanut Butter', 'Jif', '16 oz', 'peanut_butter', 'creamy', 'OR', true),
('011110913340', 'Natural Peanut Butter', 'Simple Truth', '16 oz', 'peanut_butter', 'natural', 'OR', true),
-- Juice
('070038360902', '100% Apple Juice', 'Kroger', '64 oz', 'juice', 'apple', 'OR', true),
('070038360919', '100% Orange Juice', 'Kroger', '64 oz', 'juice', 'orange', 'OR', true),
-- Cheese
('021000013050', 'American Cheese Singles', 'Kraft', '16 oz', 'cheese', 'american', 'OR', true),
('011110914361', 'Organic Mild Cheddar', 'Simple Truth Organic', '8 oz', 'cheese', 'cheddar', 'OR', true),
-- Whole Grains
('073410013557', 'Whole Wheat Bread', 'Dave''s Killer Bread', '25 oz', 'whole_grains', 'bread', 'OR', true),
('070038617174', 'Brown Rice', 'Kroger', '32 oz', 'whole_grains', 'rice', 'OR', true),
-- Infant Formula
('300875121030', 'Similac Pro-Advance', 'Abbott', '12.4 oz', 'infant_formula', 'standard', 'OR', true),
('300875121405', 'Similac Pro-Total Comfort', 'Abbott', '12 oz', 'infant_formula', 'gentle', 'OR', true),
('300871239319', 'Enfamil Gentlease', 'Mead Johnson', '12.4 oz', 'infant_formula', 'gentle', 'OR', true)
ON CONFLICT (upc) DO UPDATE SET state = 'OR', active = true;

-- =====================================================
-- NEW YORK (NY) - Sample APL Data
-- =====================================================

INSERT INTO apl_products (upc, product_name, brand, size, category, subcategory, state, active)
VALUES
-- Milk
('041190450978', 'Vitamin D Milk', 'ShopRite', '1 gal', 'milk', 'whole', 'NY', true),
('041190450947', '2% Reduced Fat Milk', 'ShopRite', '1 gal', 'milk', 'reduced_fat', 'NY', true),
('041190450923', 'Fat Free Skim Milk', 'ShopRite', '1 gal', 'milk', 'fat_free', 'NY', true),
('011110406958', 'Vitamin D Milk', 'Kroger', '1 gal', 'milk', 'whole', 'NY', true),
-- Eggs
('041190453412', 'Grade A Large Eggs', 'ShopRite', '1 dozen', 'eggs', 'large', 'NY', true),
('078742371153', 'Large White Eggs', 'Great Value', '1 dozen', 'eggs', 'large', 'NY', true),
-- Cereal
('016000275287', 'Cheerios', 'General Mills', '12 oz', 'cereal', 'whole_grain', 'NY', true),
('038000786730', 'Rice Krispies', 'Kellogg''s', '12 oz', 'cereal', 'whole_grain', 'NY', true),
('016000169579', 'Total Whole Grain', 'General Mills', '10.6 oz', 'cereal', 'whole_grain', 'NY', true),
('038000219856', 'Raisin Bran', 'Kellogg''s', '18.7 oz', 'cereal', 'whole_grain', 'NY', true),
-- Peanut Butter
('051500255162', 'Creamy Peanut Butter', 'Jif', '16 oz', 'peanut_butter', 'creamy', 'NY', true),
('044000030827', 'Creamy Peanut Butter', 'Skippy', '16.3 oz', 'peanut_butter', 'creamy', 'NY', true),
('041190456369', 'Natural Peanut Butter', 'ShopRite', '16 oz', 'peanut_butter', 'natural', 'NY', true),
-- Juice
('041190454013', '100% Apple Juice', 'ShopRite', '64 oz', 'juice', 'apple', 'NY', true),
('048500003046', '100% Apple Juice', 'Mott''s', '64 oz', 'juice', 'apple', 'NY', true),
('014800000023', '100% Orange Juice', 'Minute Maid', '64 oz', 'juice', 'orange', 'NY', true),
-- Cheese
('021000013050', 'American Cheese Singles', 'Kraft', '16 oz', 'cheese', 'american', 'NY', true),
('041190454686', 'Mild Cheddar Cheese Block', 'ShopRite', '8 oz', 'cheese', 'cheddar', 'NY', true),
('021000658879', 'String Cheese', 'Polly-O', '12 oz', 'cheese', 'mozzarella', 'NY', true),
-- Whole Grains
('050000009909', 'Whole Wheat Bread', 'Nature''s Own', '20 oz', 'whole_grains', 'bread', 'NY', true),
('072220001311', 'Whole Wheat Tortillas', 'Mission', '8 ct', 'whole_grains', 'tortillas', 'NY', true),
('041190451937', 'Brown Rice', 'ShopRite', '32 oz', 'whole_grains', 'rice', 'NY', true),
-- Infant Formula
('300875121030', 'Similac Pro-Advance', 'Abbott', '12.4 oz', 'infant_formula', 'standard', 'NY', true),
('300871239265', 'Similac Sensitive', 'Abbott', '12.5 oz', 'infant_formula', 'sensitive', 'NY', true),
('300875121191', 'Enfamil NeuroPro', 'Mead Johnson', '12.5 oz', 'infant_formula', 'standard', 'NY', true),
('050000004805', 'Gerber Good Start GentlePro', 'Gerber', '12.7 oz', 'infant_formula', 'gentle', 'NY', true),
-- Infant Food
('015000005108', 'Stage 2 Bananas', 'Gerber', '4 oz', 'infant_food', 'fruits', 'NY', true),
('015000002510', 'Stage 2 Sweet Potatoes', 'Gerber', '4 oz', 'infant_food', 'vegetables', 'NY', true)
ON CONFLICT (upc) DO UPDATE SET state = 'NY', active = true;

-- Create view for easy state statistics
CREATE OR REPLACE VIEW apl_state_statistics AS
SELECT
  state,
  COUNT(*) as total_products,
  COUNT(DISTINCT category) as categories,
  COUNT(CASE WHEN category = 'infant_formula' THEN 1 END) as formula_products,
  MAX(updated_at) as last_updated
FROM apl_products
WHERE active = true
GROUP BY state
ORDER BY state;

-- Log the expansion
DO $$
BEGIN
  RAISE NOTICE 'Multi-state APL expansion complete. Added sample data for NC, FL, OR, NY.';
  RAISE NOTICE 'Note: This is sample data for development. Production should use official state APL files.';
END $$;
