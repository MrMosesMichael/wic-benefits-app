-- Migration 010: Formula-to-Retailer Mapping
-- Static data about which retailer chains typically carry which formula types

CREATE TABLE IF NOT EXISTS formula_retailer_availability (
  id SERIAL PRIMARY KEY,
  chain VARCHAR(50) NOT NULL,
  formula_type VARCHAR(50) NOT NULL,
  brand VARCHAR(100),  -- NULL = all brands of this type
  likelihood VARCHAR(20) NOT NULL,  -- always, usually, sometimes, rarely
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(chain, formula_type, brand)
);

-- Index for lookups
CREATE INDEX idx_formula_retailer_chain ON formula_retailer_availability(chain);
CREATE INDEX idx_formula_retailer_type ON formula_retailer_availability(formula_type);
CREATE INDEX idx_formula_retailer_likelihood ON formula_retailer_availability(likelihood);

-- Seed data for typical availability patterns
INSERT INTO formula_retailer_availability (chain, formula_type, brand, likelihood, notes) VALUES
  -- Standard formulas - widely available at most retailers
  ('walmart', 'standard', NULL, 'always', 'Walmart carries all major standard formula brands'),
  ('target', 'standard', NULL, 'always', 'Target has good standard formula selection'),
  ('kroger', 'standard', NULL, 'always', 'Kroger stocks standard formulas reliably'),
  ('meijer', 'standard', NULL, 'always', 'Meijer has comprehensive formula section'),
  ('cvs', 'standard', NULL, 'usually', 'CVS carries standard formulas, selection varies by location'),
  ('walgreens', 'standard', NULL, 'usually', 'Walgreens stocks standard formulas'),
  ('rite_aid', 'standard', NULL, 'usually', 'Rite Aid has basic formula selection'),
  ('costco', 'standard', NULL, 'always', 'Costco has bulk formula options'),
  ('sams_club', 'standard', NULL, 'always', 'Sams Club has bulk formula options'),

  -- Sensitive/Gentle formulas
  ('walmart', 'sensitive', NULL, 'always', 'Good selection of sensitive formulas'),
  ('target', 'sensitive', NULL, 'always', 'Target carries major sensitive formula brands'),
  ('kroger', 'sensitive', NULL, 'usually', 'Most Kroger locations stock sensitive formulas'),
  ('meijer', 'sensitive', NULL, 'usually', 'Meijer has sensitive formula options'),
  ('cvs', 'sensitive', NULL, 'sometimes', 'Limited sensitive formula selection'),
  ('walgreens', 'sensitive', NULL, 'sometimes', 'Limited sensitive formula selection'),

  ('walmart', 'gentle', NULL, 'always', 'Good selection of gentle formulas'),
  ('target', 'gentle', NULL, 'always', 'Target carries gentle formula options'),
  ('kroger', 'gentle', NULL, 'usually', 'Kroger stocks gentle formulas'),
  ('meijer', 'gentle', NULL, 'usually', 'Meijer has gentle formula options'),

  -- Hypoallergenic - larger stores and pharmacies
  ('walmart', 'hypoallergenic', NULL, 'usually', 'Supercenters typically have hypoallergenic options'),
  ('target', 'hypoallergenic', NULL, 'usually', 'Target carries Nutramigen and Alimentum'),
  ('cvs', 'hypoallergenic', NULL, 'usually', 'CVS pharmacy sections often stock hypoallergenic'),
  ('walgreens', 'hypoallergenic', NULL, 'usually', 'Walgreens pharmacy sections stock hypoallergenic'),
  ('kroger', 'hypoallergenic', NULL, 'sometimes', 'Larger Kroger stores may have hypoallergenic'),
  ('meijer', 'hypoallergenic', NULL, 'sometimes', 'Selection varies by location'),

  -- Organic formulas
  ('whole_foods', 'organic', NULL, 'always', 'Best selection of organic formulas'),
  ('target', 'organic', NULL, 'usually', 'Target carries Happy Baby and other organic brands'),
  ('kroger', 'organic', NULL, 'sometimes', 'Limited organic formula selection'),
  ('walmart', 'organic', NULL, 'sometimes', 'Some Walmart locations carry organic options'),
  ('meijer', 'organic', NULL, 'sometimes', 'Limited organic selection'),

  -- Soy formulas
  ('walmart', 'soy', NULL, 'always', 'Good soy formula selection'),
  ('target', 'soy', NULL, 'always', 'Target stocks major soy formula brands'),
  ('kroger', 'soy', NULL, 'usually', 'Kroger carries soy formula options'),
  ('meijer', 'soy', NULL, 'usually', 'Meijer has soy formula options'),
  ('cvs', 'soy', NULL, 'sometimes', 'Limited soy formula selection'),
  ('walgreens', 'soy', NULL, 'sometimes', 'Limited soy formula selection'),

  -- Specialty formulas (AR, preemie, etc.) - pharmacies and larger stores
  ('cvs', 'specialty', NULL, 'usually', 'CVS carries specialty formulas for medical needs'),
  ('walgreens', 'specialty', NULL, 'usually', 'Walgreens stocks specialty medical formulas'),
  ('walmart', 'specialty', NULL, 'sometimes', 'Supercenter pharmacies may carry specialty'),
  ('target', 'specialty', NULL, 'sometimes', 'Limited specialty formula availability'),

  -- Store brand formulas - exclusive to their chains
  ('walmart', 'store_brand', 'Parents Choice', 'always', 'Walmart exclusive store brand'),
  ('target', 'store_brand', 'Up & Up', 'always', 'Target exclusive store brand'),
  ('kroger', 'store_brand', 'Comforts', 'always', 'Kroger exclusive store brand'),
  ('meijer', 'store_brand', 'Meijer Brand', 'always', 'Meijer exclusive store brand'),
  ('costco', 'store_brand', 'Kirkland Signature', 'always', 'Costco exclusive store brand'),
  ('sams_club', 'store_brand', 'Members Mark', 'always', 'Sams Club exclusive store brand')

ON CONFLICT (chain, formula_type, brand) DO UPDATE
SET likelihood = EXCLUDED.likelihood,
    notes = EXCLUDED.notes;
