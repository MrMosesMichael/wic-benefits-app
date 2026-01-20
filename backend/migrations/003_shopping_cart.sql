-- Migration 003: Add shopping cart and transaction tables
-- Creates tables for cart management and purchase history

-- Shopping carts (one active cart per household)
CREATE TABLE shopping_carts (
  id SERIAL PRIMARY KEY,
  household_id INTEGER NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'checking_out', 'completed', 'abandoned')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  -- Ensure only one active cart per household
  UNIQUE(household_id, status) DEFERRABLE INITIALLY DEFERRED
);

-- Partial unique index to enforce one active cart per household
CREATE UNIQUE INDEX idx_one_active_cart_per_household
ON shopping_carts(household_id)
WHERE status = 'active';

-- Cart items (products added to cart)
CREATE TABLE cart_items (
  id SERIAL PRIMARY KEY,
  cart_id INTEGER NOT NULL REFERENCES shopping_carts(id) ON DELETE CASCADE,
  participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  upc VARCHAR(14) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  brand VARCHAR(100),
  size VARCHAR(50),
  category VARCHAR(50) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL CHECK (quantity > 0),
  unit VARCHAR(20) NOT NULL,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transactions (completed purchases)
CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  household_id INTEGER NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  cart_id INTEGER REFERENCES shopping_carts(id),
  completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('completed', 'voided'))
);

-- Benefit consumptions (detailed record of what was purchased)
CREATE TABLE benefit_consumptions (
  id SERIAL PRIMARY KEY,
  transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  benefit_id INTEGER NOT NULL REFERENCES benefits(id) ON DELETE CASCADE,
  upc VARCHAR(14) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL,
  amount_consumed DECIMAL(10,2) NOT NULL CHECK (amount_consumed > 0),
  unit VARCHAR(20) NOT NULL,
  consumed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_cart_items_cart ON cart_items(cart_id);
CREATE INDEX idx_cart_items_participant ON cart_items(participant_id);
CREATE INDEX idx_transactions_household ON transactions(household_id);
CREATE INDEX idx_transactions_cart ON transactions(cart_id);
CREATE INDEX idx_benefit_consumptions_transaction ON benefit_consumptions(transaction_id);
CREATE INDEX idx_benefit_consumptions_benefit ON benefit_consumptions(benefit_id);

-- Comments for documentation
COMMENT ON TABLE shopping_carts IS 'Active shopping carts for households';
COMMENT ON TABLE cart_items IS 'Items in shopping carts';
COMMENT ON TABLE transactions IS 'Completed purchase transactions';
COMMENT ON TABLE benefit_consumptions IS 'Detailed record of benefit usage per transaction';
