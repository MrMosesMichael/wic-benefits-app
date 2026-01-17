-- WIC Benefits Database Schema - Michigan MVP
-- Migration 001: Initial schema

-- Michigan APL (Approved Product List) table
CREATE TABLE IF NOT EXISTS apl_products (
  id SERIAL PRIMARY KEY,
  upc VARCHAR(14) NOT NULL UNIQUE,
  product_name VARCHAR(255) NOT NULL,
  brand VARCHAR(100),
  size VARCHAR(50),
  category VARCHAR(50) NOT NULL,
  subcategory VARCHAR(50),
  restrictions TEXT,
  state VARCHAR(2) DEFAULT 'MI' NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Product metadata (from Open Food Facts or other sources)
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  upc VARCHAR(14) NOT NULL UNIQUE,
  name VARCHAR(255),
  brand VARCHAR(100),
  size VARCHAR(50),
  image_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Households
CREATE TABLE IF NOT EXISTS households (
  id SERIAL PRIMARY KEY,
  state VARCHAR(2) DEFAULT 'MI' NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Participants (household members)
CREATE TABLE IF NOT EXISTS participants (
  id SERIAL PRIMARY KEY,
  household_id INTEGER NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('pregnant', 'postpartum', 'breastfeeding', 'infant', 'child')),
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Benefits (monthly allocations)
CREATE TABLE IF NOT EXISTS benefits (
  id SERIAL PRIMARY KEY,
  participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL,
  category_label VARCHAR(100) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  available_amount DECIMAL(10,2) NOT NULL,
  unit VARCHAR(20) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_apl_upc ON apl_products(upc);
CREATE INDEX idx_apl_category ON apl_products(category);
CREATE INDEX idx_apl_state ON apl_products(state);
CREATE INDEX idx_products_upc ON products(upc);
CREATE INDEX idx_participants_household ON participants(household_id);
CREATE INDEX idx_benefits_participant ON benefits(participant_id);

-- Insert sample Michigan APL data for testing
INSERT INTO apl_products (upc, product_name, brand, size, category, subcategory) VALUES
  ('041220576067', 'Whole Milk', 'Great Value', '1 gallon', 'milk', 'whole'),
  ('041220576074', '2% Reduced Fat Milk', 'Great Value', '1 gallon', 'milk', 'reduced_fat'),
  ('007874213959', 'Large White Eggs', 'Great Value', '12 count', 'eggs', 'white'),
  ('016000275256', 'Cheerios', 'General Mills', '18 oz', 'cereal', 'whole_grain'),
  ('037600100670', 'Jif Creamy Peanut Butter', 'Jif', '16 oz', 'peanut_butter', 'creamy');

-- Insert demo household for testing
INSERT INTO households (id) VALUES (1);

-- Insert demo participant
INSERT INTO participants (household_id, type, name) VALUES (1, 'child', 'Demo Child');

-- Insert demo benefits
INSERT INTO benefits (participant_id, category, category_label, total_amount, available_amount, unit, period_start, period_end) VALUES
  (1, 'milk', 'Milk', 4, 4, 'gal', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days'),
  (1, 'eggs', 'Eggs', 2, 2, 'doz', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days'),
  (1, 'cereal', 'Cereal', 36, 36, 'oz', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days'),
  (1, 'peanut_butter', 'Peanut Butter', 18, 18, 'oz', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days');
