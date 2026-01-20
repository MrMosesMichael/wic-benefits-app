-- Migration 002: Add three-state benefits tracking
-- Adds in_cart_amount and consumed_amount columns to benefits table
-- Ensures total_amount = available_amount + in_cart_amount + consumed_amount

-- Add new columns for tracking benefits in different states
ALTER TABLE benefits
  ADD COLUMN in_cart_amount DECIMAL(10,2) DEFAULT 0 NOT NULL,
  ADD COLUMN consumed_amount DECIMAL(10,2) DEFAULT 0 NOT NULL;

-- Initialize new columns with zero values
UPDATE benefits
SET in_cart_amount = 0, consumed_amount = 0;

-- Add constraint to ensure amounts always balance
-- total_amount should equal the sum of available, in_cart, and consumed
ALTER TABLE benefits
  ADD CONSTRAINT benefits_amount_balance
  CHECK (total_amount = available_amount + in_cart_amount + consumed_amount);

-- Note: This constraint ensures data integrity across all cart operations
