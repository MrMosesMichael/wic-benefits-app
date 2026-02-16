-- Migration 023: User-Created Recipes
-- Community recipe submission with voting and moderation

CREATE TABLE IF NOT EXISTS recipes (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  title_es VARCHAR(255),
  category VARCHAR(50) NOT NULL CHECK (category IN ('breakfast', 'lunch', 'dinner', 'snacks', 'baby_food')),
  prep_time_minutes INTEGER NOT NULL CHECK (prep_time_minutes > 0),
  servings INTEGER NOT NULL CHECK (servings > 0),
  difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  wic_ingredients JSONB NOT NULL DEFAULT '[]',
  non_wic_ingredients JSONB NOT NULL DEFAULT '[]',
  instructions JSONB NOT NULL DEFAULT '[]',
  submitted_by VARCHAR(100),
  is_bundled BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'hidden', 'flagged', 'deleted')),
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  net_score INTEGER DEFAULT 0,
  flag_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS recipe_votes (
  id SERIAL PRIMARY KEY,
  recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  voter_id VARCHAR(100) NOT NULL,
  vote_type VARCHAR(4) NOT NULL CHECK (vote_type IN ('up', 'down')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(recipe_id, voter_id)
);

CREATE TABLE IF NOT EXISTS recipe_flags (
  id SERIAL PRIMARY KEY,
  recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  flagger_id VARCHAR(100) NOT NULL,
  reason VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(recipe_id, flagger_id)
);

-- Indexes
CREATE INDEX idx_recipes_category ON recipes(category);
CREATE INDEX idx_recipes_status ON recipes(status);
CREATE INDEX idx_recipes_net_score ON recipes(net_score DESC);
CREATE INDEX idx_recipes_created ON recipes(created_at DESC);
CREATE INDEX idx_recipe_votes_recipe ON recipe_votes(recipe_id);
CREATE INDEX idx_recipe_flags_recipe ON recipe_flags(recipe_id);

-- Update trigger
CREATE OR REPLACE FUNCTION update_recipes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_recipes_updated_at
  BEFORE UPDATE ON recipes
  FOR EACH ROW
  EXECUTE FUNCTION update_recipes_updated_at();
