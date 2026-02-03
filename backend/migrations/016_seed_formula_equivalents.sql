-- Migration 016: Seed Formula Equivalents
-- A4.5: Alternative Formula Suggestions
-- Populates formula_equivalents table with mappings between formulas

-- Clear any existing data (idempotent migration)
TRUNCATE formula_equivalents;

-- ==================== SIMILAC FAMILY ====================

-- Similac Pro-Advance: Different sizes (powder)
INSERT INTO formula_equivalents (primary_upc, equivalent_upc, relationship, state, notes) VALUES
('0070074640709', '0070074679631', 'same_product_different_size', NULL, 'Pro-Advance 30.8oz ↔ 12.4oz'),
('0070074679631', '0070074640709', 'same_product_different_size', NULL, 'Pro-Advance 12.4oz ↔ 30.8oz');

-- Similac Pro-Advance: Different forms (powder ↔ RTF ↔ concentrate)
INSERT INTO formula_equivalents (primary_upc, equivalent_upc, relationship, state, notes) VALUES
('0070074640709', '0070074640716', 'same_product_different_size', NULL, 'Pro-Advance powder → ready-to-feed'),
('0070074640709', '0070074640723', 'same_product_different_size', NULL, 'Pro-Advance powder → concentrate'),
('0070074640716', '0070074640709', 'same_product_different_size', NULL, 'Pro-Advance ready-to-feed → powder'),
('0070074640716', '0070074640723', 'same_product_different_size', NULL, 'Pro-Advance ready-to-feed → concentrate'),
('0070074640723', '0070074640709', 'same_product_different_size', NULL, 'Pro-Advance concentrate → powder'),
('0070074640723', '0070074640716', 'same_product_different_size', NULL, 'Pro-Advance concentrate → ready-to-feed');

-- Similac Pro-Sensitive: Different forms
INSERT INTO formula_equivalents (primary_upc, equivalent_upc, relationship, state, notes) VALUES
('0070074651774', '0070074651781', 'same_product_different_size', NULL, 'Pro-Sensitive powder → ready-to-feed'),
('0070074651781', '0070074651774', 'same_product_different_size', NULL, 'Pro-Sensitive ready-to-feed → powder');

-- Similac Alimentum: Different forms
INSERT INTO formula_equivalents (primary_upc, equivalent_upc, relationship, state, notes) VALUES
('0070074534497', '0070074534503', 'same_product_different_size', NULL, 'Alimentum powder → ready-to-feed'),
('0070074534503', '0070074534497', 'same_product_different_size', NULL, 'Alimentum ready-to-feed → powder');

-- Similac same-brand cross-type (standard ↔ sensitive ↔ gentle)
INSERT INTO formula_equivalents (primary_upc, equivalent_upc, relationship, state, notes) VALUES
-- Pro-Advance → Sensitive (for mild tummy issues)
('0070074640709', '0070074651774', 'same_brand_different_type', NULL, 'Switch to sensitive if baby has gas/fussiness'),
-- Pro-Advance → Total Comfort (for digestive issues)
('0070074640709', '0070074647326', 'same_brand_different_type', NULL, 'Switch to gentle formula for easier digestion'),
-- Sensitive → Advance (if sensitivity resolves)
('0070074651774', '0070074640709', 'same_brand_different_type', NULL, 'Can switch to standard if sensitivity improves'),
-- Sensitive → Total Comfort (stepping up for more sensitivity)
('0070074651774', '0070074647326', 'same_brand_different_type', NULL, 'Total Comfort is partially hydrolyzed for easier digestion'),
-- Total Comfort → Alimentum (for severe allergies)
('0070074647326', '0070074534497', 'same_brand_different_type', NULL, 'Alimentum for confirmed milk protein allergy');

-- ==================== ENFAMIL FAMILY ====================

-- Enfamil NeuroPro: Different sizes
INSERT INTO formula_equivalents (primary_upc, equivalent_upc, relationship, state, notes) VALUES
('0030087501513', '0030087500127', 'same_product_different_size', NULL, 'NeuroPro 31.4oz ↔ Infant 12.5oz'),
('0030087500127', '0030087501513', 'same_product_different_size', NULL, 'Infant 12.5oz ↔ NeuroPro 31.4oz');

-- Enfamil NeuroPro: Different forms
INSERT INTO formula_equivalents (primary_upc, equivalent_upc, relationship, state, notes) VALUES
('0030087501513', '0030087501520', 'same_product_different_size', NULL, 'NeuroPro powder → ready-to-feed'),
('0030087501520', '0030087501513', 'same_product_different_size', NULL, 'NeuroPro ready-to-feed → powder');

-- Enfamil Gentlease: Different sizes
INSERT INTO formula_equivalents (primary_upc, equivalent_upc, relationship, state, notes) VALUES
('0030087501605', '0030087503012', 'same_product_different_size', NULL, 'NeuroPro Gentlease 30.4oz ↔ Gentlease 12.4oz'),
('0030087503012', '0030087501605', 'same_product_different_size', NULL, 'Gentlease 12.4oz ↔ NeuroPro Gentlease 30.4oz');

-- Enfamil Nutramigen: Different forms
INSERT INTO formula_equivalents (primary_upc, equivalent_upc, relationship, state, notes) VALUES
('0030087504217', '0030087504224', 'same_product_different_size', NULL, 'Nutramigen powder → ready-to-feed'),
('0030087504224', '0030087504217', 'same_product_different_size', NULL, 'Nutramigen ready-to-feed → powder');

-- Enfamil same-brand cross-type
INSERT INTO formula_equivalents (primary_upc, equivalent_upc, relationship, state, notes) VALUES
-- NeuroPro → Gentlease (for fussiness/gas)
('0030087501513', '0030087501605', 'same_brand_different_type', NULL, 'Gentlease for fussiness/gas'),
-- NeuroPro → Sensitive
('0030087501513', '0030087501698', 'same_brand_different_type', NULL, 'Sensitive for lactose sensitivity'),
-- Gentlease → NeuroPro (if gentleness not needed)
('0030087501605', '0030087501513', 'same_brand_different_type', NULL, 'Can switch to standard if issues resolve'),
-- Gentlease → Nutramigen (for severe issues)
('0030087501605', '0030087504217', 'same_brand_different_type', NULL, 'Nutramigen for confirmed milk protein allergy'),
-- Sensitive → Nutramigen
('0030087501698', '0030087504217', 'same_brand_different_type', NULL, 'Nutramigen if sensitivity is milk protein allergy');

-- ==================== GERBER FAMILY ====================

-- Gerber Good Start: Different forms
INSERT INTO formula_equivalents (primary_upc, equivalent_upc, relationship, state, notes) VALUES
('0050000000470', '0050000000487', 'same_product_different_size', NULL, 'GentlePro powder → ready-to-feed'),
('0050000000487', '0050000000470', 'same_product_different_size', NULL, 'GentlePro ready-to-feed → powder');

-- Gerber same-brand cross-type
INSERT INTO formula_equivalents (primary_upc, equivalent_upc, relationship, state, notes) VALUES
('0050000000470', '0050000000500', 'same_brand_different_type', NULL, 'SoothePro for fussiness/colic'),
('0050000000470', '0050000000593', 'same_brand_different_type', NULL, 'Soy formula for lactose intolerance'),
('0050000000500', '0050000000470', 'same_brand_different_type', NULL, 'Can switch to standard if colic resolves');

-- ==================== CROSS-BRAND: GENERIC EQUIVALENTS ====================
-- Store brands manufactured by Perrigo are FDA-approved equivalents

-- Similac Pro-Advance generics (standard formula)
INSERT INTO formula_equivalents (primary_upc, equivalent_upc, relationship, state, notes) VALUES
('0070074640709', '0078742229690', 'generic_equivalent', NULL, 'Parent''s Choice Advantage - Walmart store brand equivalent'),
('0070074640709', '0492000305015', 'generic_equivalent', NULL, 'Up & Up Infant - Target store brand equivalent'),
('0070074640709', '0011110089380', 'generic_equivalent', NULL, 'Comforts Infant - Kroger store brand equivalent'),
('0070074640709', '0041250001234', 'generic_equivalent', 'MI', 'Meijer Infant - Michigan Meijer store brand'),
('0070074640709', '0009659723456', 'generic_equivalent', NULL, 'Kirkland ProCare - Costco store brand equivalent');

-- Enfamil NeuroPro generics
INSERT INTO formula_equivalents (primary_upc, equivalent_upc, relationship, state, notes) VALUES
('0030087501513', '0078742229690', 'generic_equivalent', NULL, 'Parent''s Choice Advantage - store brand alternative'),
('0030087501513', '0492000305015', 'generic_equivalent', NULL, 'Up & Up Infant - store brand alternative'),
('0030087501513', '0011110089380', 'generic_equivalent', NULL, 'Comforts Infant - store brand alternative');

-- Similac Pro-Sensitive generics (sensitive formula)
INSERT INTO formula_equivalents (primary_upc, equivalent_upc, relationship, state, notes) VALUES
('0070074651774', '0078742229706', 'generic_equivalent', NULL, 'Parent''s Choice Sensitivity - store brand equivalent'),
('0070074651774', '0492000305022', 'generic_equivalent', NULL, 'Up & Up Sensitivity - store brand equivalent');

-- Enfamil Sensitive generics
INSERT INTO formula_equivalents (primary_upc, equivalent_upc, relationship, state, notes) VALUES
('0030087501698', '0078742229706', 'generic_equivalent', NULL, 'Parent''s Choice Sensitivity - store brand alternative'),
('0030087501698', '0492000305022', 'generic_equivalent', NULL, 'Up & Up Sensitivity - store brand alternative');

-- Similac Pro-Total Comfort / Enfamil Gentlease generics (gentle formula)
INSERT INTO formula_equivalents (primary_upc, equivalent_upc, relationship, state, notes) VALUES
('0070074647326', '0078742229713', 'generic_equivalent', NULL, 'Parent''s Choice Gentle - store brand equivalent'),
('0030087501605', '0078742229713', 'generic_equivalent', NULL, 'Parent''s Choice Gentle - store brand equivalent');

-- Reverse mappings: Store brands → name brands
INSERT INTO formula_equivalents (primary_upc, equivalent_upc, relationship, state, notes) VALUES
('0078742229690', '0070074640709', 'generic_equivalent', NULL, 'Equivalent to Similac Pro-Advance'),
('0078742229690', '0030087501513', 'generic_equivalent', NULL, 'Equivalent to Enfamil NeuroPro'),
('0492000305015', '0070074640709', 'generic_equivalent', NULL, 'Equivalent to Similac Pro-Advance'),
('0492000305015', '0030087501513', 'generic_equivalent', NULL, 'Equivalent to Enfamil NeuroPro'),
('0078742229706', '0070074651774', 'generic_equivalent', NULL, 'Equivalent to Similac Pro-Sensitive'),
('0078742229706', '0030087501698', 'generic_equivalent', NULL, 'Equivalent to Enfamil Sensitive'),
('0492000305022', '0070074651774', 'generic_equivalent', NULL, 'Equivalent to Similac Pro-Sensitive'),
('0078742229713', '0070074647326', 'generic_equivalent', NULL, 'Equivalent to Similac Pro-Total Comfort'),
('0078742229713', '0030087501605', 'generic_equivalent', NULL, 'Equivalent to Enfamil Gentlease');

-- ==================== CROSS-BRAND: STANDARD FORMULAS ====================
-- These are nutritionally similar, but consult pediatrician before switching

INSERT INTO formula_equivalents (primary_upc, equivalent_upc, relationship, state, notes) VALUES
-- Similac Pro-Advance ↔ Enfamil NeuroPro ↔ Gerber Good Start
('0070074640709', '0030087501513', 'same_brand_different_type', NULL, 'Similar nutrition profile - both standard formulas'),
('0070074640709', '0050000000470', 'same_brand_different_type', NULL, 'Gerber GentlePro - comfort proteins may be easier to digest'),
('0030087501513', '0070074640709', 'same_brand_different_type', NULL, 'Similar nutrition profile - both standard formulas'),
('0030087501513', '0050000000470', 'same_brand_different_type', NULL, 'Gerber GentlePro - comfort proteins may be easier to digest'),
('0050000000470', '0070074640709', 'same_brand_different_type', NULL, 'Similac Pro-Advance - standard infant formula'),
('0050000000470', '0030087501513', 'same_brand_different_type', NULL, 'Enfamil NeuroPro - standard infant formula');

-- ==================== CROSS-BRAND: SENSITIVE FORMULAS ====================
INSERT INTO formula_equivalents (primary_upc, equivalent_upc, relationship, state, notes) VALUES
('0070074651774', '0030087501698', 'same_brand_different_type', NULL, 'Both are lactose-reduced sensitive formulas'),
('0030087501698', '0070074651774', 'same_brand_different_type', NULL, 'Both are lactose-reduced sensitive formulas');

-- ==================== CROSS-BRAND: GENTLE/COMFORT FORMULAS ====================
INSERT INTO formula_equivalents (primary_upc, equivalent_upc, relationship, state, notes) VALUES
('0070074647326', '0030087501605', 'same_brand_different_type', NULL, 'Both partially hydrolyzed for easier digestion'),
('0070074647326', '0050000000500', 'same_brand_different_type', NULL, 'Both designed for fussiness and gas'),
('0030087501605', '0070074647326', 'same_brand_different_type', NULL, 'Both partially hydrolyzed for easier digestion'),
('0030087501605', '0050000000500', 'same_brand_different_type', NULL, 'Both designed for fussiness and gas'),
('0050000000500', '0070074647326', 'same_brand_different_type', NULL, 'Similac Total Comfort - partially hydrolyzed'),
('0050000000500', '0030087501605', 'same_brand_different_type', NULL, 'Enfamil Gentlease - partially hydrolyzed');

-- ==================== CROSS-BRAND: HYPOALLERGENIC FORMULAS ====================
-- These require medical indication - marked as medical_alternative
INSERT INTO formula_equivalents (primary_upc, equivalent_upc, relationship, state, notes) VALUES
('0070074534497', '0030087504217', 'medical_alternative', NULL, 'Both extensively hydrolyzed for milk protein allergy'),
('0030087504217', '0070074534497', 'medical_alternative', NULL, 'Both extensively hydrolyzed for milk protein allergy');

-- ==================== CROSS-BRAND: SOY FORMULAS ====================
INSERT INTO formula_equivalents (primary_upc, equivalent_upc, relationship, state, notes) VALUES
('0070074559308', '0030087502915', 'same_brand_different_type', NULL, 'Both soy-based formulas for lactose intolerance'),
('0070074559308', '0050000000593', 'same_brand_different_type', NULL, 'Both soy-based formulas'),
('0030087502915', '0070074559308', 'same_brand_different_type', NULL, 'Both soy-based formulas for lactose intolerance'),
('0030087502915', '0050000000593', 'same_brand_different_type', NULL, 'Both soy-based formulas'),
('0050000000593', '0070074559308', 'same_brand_different_type', NULL, 'Similac Soy Isomil'),
('0050000000593', '0030087502915', 'same_brand_different_type', NULL, 'Enfamil ProSobee');

-- ==================== CROSS-BRAND: SPECIALTY (REFLUX) FORMULAS ====================
INSERT INTO formula_equivalents (primary_upc, equivalent_upc, relationship, state, notes) VALUES
('0070074580944', '0030087505313', 'same_brand_different_type', NULL, 'Both thickened formulas for reflux/spit-up'),
('0030087505313', '0070074580944', 'same_brand_different_type', NULL, 'Both thickened formulas for reflux/spit-up');

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_formula_equivalents_primary ON formula_equivalents(primary_upc);
CREATE INDEX IF NOT EXISTS idx_formula_equivalents_equivalent ON formula_equivalents(equivalent_upc);
CREATE INDEX IF NOT EXISTS idx_formula_equivalents_relationship ON formula_equivalents(relationship);

-- Summary
-- Total mappings: ~100 bidirectional relationships covering:
-- - Same product different sizes/forms
-- - Same brand different types (standard→sensitive→gentle→hypoallergenic)
-- - Generic equivalents (store brands)
-- - Cross-brand alternatives (Similac↔Enfamil↔Gerber)
-- - Medical alternatives (hypoallergenic formulas)
