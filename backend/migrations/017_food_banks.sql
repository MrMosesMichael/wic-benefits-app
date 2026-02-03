-- Migration 017: Food Banks
-- Group J: Food Bank Finder

-- Food banks and pantries table
CREATE TABLE IF NOT EXISTS food_banks (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  organization_type VARCHAR(50) NOT NULL CHECK (organization_type IN ('food_bank', 'food_pantry', 'soup_kitchen', 'mobile_pantry', 'community_center')),

  -- Address
  street_address VARCHAR(255) NOT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(2) NOT NULL,
  zip_code VARCHAR(10) NOT NULL,

  -- Coordinates
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),

  -- Contact
  phone VARCHAR(20),
  website VARCHAR(255),
  email VARCHAR(255),

  -- Hours and services
  hours_json JSONB, -- Stores detailed hours per day
  hours_notes TEXT, -- E.g., "By appointment only", "Closed holidays"
  services TEXT[], -- Array: ['groceries', 'hot_meals', 'baby_supplies', 'diapers', 'formula', 'produce', 'meat']

  -- Eligibility and requirements
  eligibility_notes TEXT, -- E.g., "Must live in Wayne County"
  required_documents TEXT[], -- Array: ['photo_id', 'proof_of_address', 'income_verification']
  accepts_wic_participants BOOLEAN DEFAULT TRUE,

  -- Data source and freshness
  data_source VARCHAR(50), -- 'feeding_america', '211', 'user_submitted', 'manual'
  source_id VARCHAR(100), -- External ID from data source
  last_verified_at TIMESTAMP,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for efficient querying
CREATE INDEX idx_food_banks_location ON food_banks(latitude, longitude);
CREATE INDEX idx_food_banks_state_city ON food_banks(state, city);
CREATE INDEX idx_food_banks_type ON food_banks(organization_type);
CREATE INDEX idx_food_banks_active ON food_banks(is_active);
CREATE INDEX idx_food_banks_services ON food_banks USING GIN (services);

-- Seed data: Michigan food banks (real organizations)
INSERT INTO food_banks (
  name, organization_type, street_address, city, state, zip_code,
  latitude, longitude, phone, website,
  hours_json, hours_notes, services, eligibility_notes, required_documents,
  data_source, is_active
) VALUES
-- Metro Detroit area
(
  'Gleaners Community Food Bank',
  'food_bank',
  '2131 Beaufait St',
  'Detroit',
  'MI',
  '48207',
  42.3481,
  -83.0278,
  '866-452-6267',
  'https://www.gcfb.org',
  '{"monday": {"open": "09:00", "close": "17:00"}, "tuesday": {"open": "09:00", "close": "17:00"}, "wednesday": {"open": "09:00", "close": "17:00"}, "thursday": {"open": "09:00", "close": "17:00"}, "friday": {"open": "09:00", "close": "17:00"}}',
  'Distribution hours vary by partner location',
  ARRAY['groceries', 'produce', 'baby_supplies', 'formula'],
  'Serves Wayne, Oakland, Macomb, Livingston, and Monroe counties',
  ARRAY[]::TEXT[],
  'manual',
  TRUE
),
(
  'Forgotten Harvest',
  'food_bank',
  '21800 Greenfield Rd',
  'Oak Park',
  'MI',
  '48237',
  42.4695,
  -83.1847,
  '248-967-1500',
  'https://www.forgottenharvest.org',
  '{"monday": {"open": "08:00", "close": "16:00"}, "tuesday": {"open": "08:00", "close": "16:00"}, "wednesday": {"open": "08:00", "close": "16:00"}, "thursday": {"open": "08:00", "close": "16:00"}, "friday": {"open": "08:00", "close": "16:00"}}',
  'Contact for distribution schedule',
  ARRAY['groceries', 'produce', 'meat', 'dairy'],
  'Serves Oakland, Macomb, and Wayne counties',
  ARRAY[]::TEXT[],
  'manual',
  TRUE
),
(
  'Focus: HOPE',
  'food_pantry',
  '1355 Oakman Blvd',
  'Detroit',
  'MI',
  '48238',
  42.3856,
  -83.1339,
  '313-494-5500',
  'https://www.focushope.edu',
  '{"monday": {"open": "08:00", "close": "17:00"}, "tuesday": {"open": "08:00", "close": "17:00"}, "wednesday": {"open": "08:00", "close": "17:00"}, "thursday": {"open": "08:00", "close": "17:00"}, "friday": {"open": "08:00", "close": "17:00"}}',
  'Commodity Supplemental Food Program available',
  ARRAY['groceries', 'baby_supplies', 'formula'],
  'Seniors 60+ and families with children under 6. Must live in Detroit or Highland Park.',
  ARRAY['photo_id', 'proof_of_address'],
  'manual',
  TRUE
),
-- Ann Arbor area
(
  'Food Gatherers',
  'food_bank',
  '1 Carrot Way',
  'Ann Arbor',
  'MI',
  '48105',
  42.3088,
  -83.7021,
  '734-761-2796',
  'https://www.foodgatherers.org',
  '{"monday": {"open": "09:00", "close": "17:00"}, "tuesday": {"open": "09:00", "close": "17:00"}, "wednesday": {"open": "09:00", "close": "17:00"}, "thursday": {"open": "09:00", "close": "17:00"}, "friday": {"open": "09:00", "close": "17:00"}}',
  'Multiple distribution sites available',
  ARRAY['groceries', 'produce', 'hot_meals'],
  'Serves Washtenaw County',
  ARRAY[]::TEXT[],
  'manual',
  TRUE
),
-- Flint area
(
  'Food Bank of Eastern Michigan',
  'food_bank',
  '2300 Lapeer Rd',
  'Flint',
  'MI',
  '48503',
  43.0209,
  -83.7096,
  '810-239-4441',
  'https://www.fbem.org',
  '{"monday": {"open": "08:00", "close": "16:30"}, "tuesday": {"open": "08:00", "close": "16:30"}, "wednesday": {"open": "08:00", "close": "16:30"}, "thursday": {"open": "08:00", "close": "16:30"}, "friday": {"open": "08:00", "close": "16:30"}}',
  'Client choice pantry available',
  ARRAY['groceries', 'produce', 'baby_supplies', 'diapers', 'formula'],
  'Serves 22 counties in eastern Michigan',
  ARRAY[]::TEXT[],
  'manual',
  TRUE
),
-- Grand Rapids area
(
  'Feeding America West Michigan',
  'food_bank',
  '864 West River Center Dr NE',
  'Comstock Park',
  'MI',
  '49321',
  43.0474,
  -85.6712,
  '616-784-3250',
  'https://www.feedwm.org',
  '{"monday": {"open": "08:00", "close": "16:30"}, "tuesday": {"open": "08:00", "close": "16:30"}, "wednesday": {"open": "08:00", "close": "16:30"}, "thursday": {"open": "08:00", "close": "16:30"}, "friday": {"open": "08:00", "close": "16:30"}}',
  'Mobile pantry schedule varies',
  ARRAY['groceries', 'produce', 'meat', 'dairy', 'baby_supplies'],
  'Serves 40 counties in West Michigan',
  ARRAY[]::TEXT[],
  'manual',
  TRUE
),
-- Lansing area
(
  'Greater Lansing Food Bank',
  'food_bank',
  '2116 E Michigan Ave',
  'Lansing',
  'MI',
  '48912',
  42.7303,
  -84.5117,
  '517-853-7800',
  'https://www.greaterlansingfoodbank.org',
  '{"monday": {"open": "08:00", "close": "17:00"}, "tuesday": {"open": "08:00", "close": "17:00"}, "wednesday": {"open": "08:00", "close": "17:00"}, "thursday": {"open": "08:00", "close": "17:00"}, "friday": {"open": "08:00", "close": "17:00"}}',
  'Same-day pickup available',
  ARRAY['groceries', 'produce', 'baby_supplies', 'formula'],
  'Serves Clinton, Eaton, and Ingham counties',
  ARRAY[]::TEXT[],
  'manual',
  TRUE
),
-- Kalamazoo area
(
  'Kalamazoo Loaves & Fishes',
  'food_pantry',
  '901 Portage St',
  'Kalamazoo',
  'MI',
  '49001',
  42.2820,
  -85.5834,
  '269-343-3663',
  'https://www.kfrm.org',
  '{"monday": {"open": "10:00", "close": "16:00"}, "tuesday": {"open": "10:00", "close": "16:00"}, "wednesday": {"open": "10:00", "close": "16:00"}, "thursday": {"open": "10:00", "close": "16:00"}, "friday": {"open": "10:00", "close": "14:00"}}',
  'Multiple mobile pantry locations',
  ARRAY['groceries', 'produce', 'hot_meals'],
  'Serves Kalamazoo County',
  ARRAY[]::TEXT[],
  'manual',
  TRUE
),
-- Saginaw area
(
  'Hidden Harvest',
  'food_bank',
  '629 N 9th St',
  'Saginaw',
  'MI',
  '48601',
  43.4356,
  -83.9516,
  '989-753-1818',
  'https://www.hidden-harvest.org',
  '{"monday": {"open": "09:00", "close": "15:00"}, "wednesday": {"open": "09:00", "close": "15:00"}, "friday": {"open": "09:00", "close": "15:00"}}',
  'Food rescue and distribution',
  ARRAY['groceries', 'produce'],
  'Serves the Great Lakes Bay Region',
  ARRAY[]::TEXT[],
  'manual',
  TRUE
),
-- Upper Peninsula
(
  'Upper Peninsula Food Bank',
  'food_bank',
  '610 Lakeshore Dr',
  'Ishpeming',
  'MI',
  '49849',
  46.4883,
  -87.6751,
  '906-486-4216',
  NULL,
  '{"monday": {"open": "08:00", "close": "16:00"}, "tuesday": {"open": "08:00", "close": "16:00"}, "wednesday": {"open": "08:00", "close": "16:00"}, "thursday": {"open": "08:00", "close": "16:00"}, "friday": {"open": "08:00", "close": "16:00"}}',
  NULL,
  ARRAY['groceries', 'produce'],
  'Serves all 15 Upper Peninsula counties',
  ARRAY[]::TEXT[],
  'manual',
  TRUE
);

-- Trigger to update updated_at on row changes
CREATE OR REPLACE FUNCTION update_food_banks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_food_banks_updated_at
  BEFORE UPDATE ON food_banks
  FOR EACH ROW
  EXECUTE FUNCTION update_food_banks_updated_at();
