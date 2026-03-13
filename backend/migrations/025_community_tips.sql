-- Migration 025: Community Tips
-- User-submitted shopping tips with voting and moderation
-- Mirrors the recipes pattern (migration 023)

CREATE TABLE IF NOT EXISTS community_tips (
  id SERIAL PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  content VARCHAR(500) NOT NULL,
  category VARCHAR(50) NOT NULL,
  tags TEXT[],
  submitted_by VARCHAR(100),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'hidden', 'flagged', 'deleted')),
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  net_score INTEGER DEFAULT 0,
  flag_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS community_tip_votes (
  id SERIAL PRIMARY KEY,
  tip_id INTEGER NOT NULL REFERENCES community_tips(id) ON DELETE CASCADE,
  voter_id VARCHAR(100) NOT NULL,
  vote_type VARCHAR(4) NOT NULL CHECK (vote_type IN ('up', 'down')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tip_id, voter_id)
);

CREATE TABLE IF NOT EXISTS community_tip_flags (
  id SERIAL PRIMARY KEY,
  tip_id INTEGER NOT NULL REFERENCES community_tips(id) ON DELETE CASCADE,
  flagger_id VARCHAR(100) NOT NULL,
  reason VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tip_id, flagger_id)
);

-- Indexes
CREATE INDEX idx_community_tips_category ON community_tips(category);
CREATE INDEX idx_community_tips_status ON community_tips(status);
CREATE INDEX idx_community_tips_net_score ON community_tips(net_score DESC);
CREATE INDEX idx_community_tips_created ON community_tips(created_at DESC);
CREATE INDEX idx_community_tip_votes_tip ON community_tip_votes(tip_id);
CREATE INDEX idx_community_tip_flags_tip ON community_tip_flags(tip_id);
