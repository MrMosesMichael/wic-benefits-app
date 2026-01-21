-- APL Sync Monitoring Tables
-- Migration: 001_apl_sync_monitoring_tables
-- Description: Creates tables for APL sync monitoring, job tracking, and health metrics
-- Created: 2026-01-20

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- APL Sync Status Table
-- Tracks the status of APL data synchronization for each state
-- ============================================================================

CREATE TABLE IF NOT EXISTS apl_sync_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- State identification
  state VARCHAR(2) NOT NULL,
  data_source VARCHAR(20) NOT NULL,

  -- Sync timestamps
  last_sync_at TIMESTAMP WITH TIME ZONE,
  last_attempt_at TIMESTAMP WITH TIME ZONE,
  next_sync_at TIMESTAMP WITH TIME ZONE,

  -- Sync status
  last_sync_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  last_sync_error TEXT,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,

  -- Sync statistics
  entries_processed INTEGER,
  entries_added INTEGER,
  entries_updated INTEGER,
  entries_removed INTEGER,

  -- File tracking
  current_source_hash VARCHAR(64),
  previous_source_hash VARCHAR(64),
  file_size_bytes BIGINT,
  last_modified_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT apl_sync_status_state_source_unique UNIQUE (state, data_source),
  CONSTRAINT apl_sync_status_status_check CHECK (
    last_sync_status IN ('pending', 'running', 'success', 'failure', 'partial')
  )
);

-- Indexes for sync status
CREATE INDEX idx_apl_sync_status_state ON apl_sync_status(state);
CREATE INDEX idx_apl_sync_status_last_sync_at ON apl_sync_status(last_sync_at DESC);
CREATE INDEX idx_apl_sync_status_status ON apl_sync_status(last_sync_status);

-- ============================================================================
-- APL Sync Job History Table
-- Detailed history of individual sync job executions
-- ============================================================================

CREATE TABLE IF NOT EXISTS apl_sync_job_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Job identification
  job_id VARCHAR(100) NOT NULL UNIQUE,
  run_id VARCHAR(100),
  state VARCHAR(2) NOT NULL,

  -- Job execution
  status VARCHAR(20) NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  duration_ms INTEGER,

  -- Job results
  entries_processed INTEGER,
  entries_added INTEGER,
  entries_updated INTEGER,
  entries_removed INTEGER,

  -- Error tracking
  error_message TEXT,
  error_stack TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,

  -- Metadata
  triggered_by VARCHAR(50),
  trigger_reason VARCHAR(50),
  priority VARCHAR(20),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT apl_sync_job_history_status_check CHECK (
    status IN ('pending', 'running', 'completed', 'failed', 'skipped', 'cancelled')
  )
);

-- Indexes for job history
CREATE INDEX idx_apl_sync_job_history_state ON apl_sync_job_history(state);
CREATE INDEX idx_apl_sync_job_history_status ON apl_sync_job_history(status);
CREATE INDEX idx_apl_sync_job_history_start_time ON apl_sync_job_history(start_time DESC);
CREATE INDEX idx_apl_sync_job_history_run_id ON apl_sync_job_history(run_id);

-- ============================================================================
-- APL Monitor Checks Table
-- History of update checks performed by the monitor
-- ============================================================================

CREATE TABLE IF NOT EXISTS apl_monitor_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Check identification
  state VARCHAR(2) NOT NULL,
  data_source VARCHAR(20) NOT NULL,

  -- Check results
  has_update BOOLEAN NOT NULL,
  current_hash VARCHAR(64),
  previous_hash VARCHAR(64),
  last_modified TIMESTAMP WITH TIME ZONE,
  file_size_bytes BIGINT,

  -- Check status
  check_success BOOLEAN NOT NULL,
  error_message TEXT,

  -- Timing
  check_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  check_duration_ms INTEGER,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for monitor checks
CREATE INDEX idx_apl_monitor_checks_state ON apl_monitor_checks(state);
CREATE INDEX idx_apl_monitor_checks_timestamp ON apl_monitor_checks(check_timestamp DESC);
CREATE INDEX idx_apl_monitor_checks_has_update ON apl_monitor_checks(has_update);

-- ============================================================================
-- APL Health Metrics Table
-- Health metrics and status over time
-- ============================================================================

CREATE TABLE IF NOT EXISTS apl_health_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Scope
  scope VARCHAR(20) NOT NULL,  -- 'system' or 'state'
  state VARCHAR(2),

  -- Overall health
  health_status VARCHAR(20) NOT NULL,

  -- Metrics
  data_freshness_hours NUMERIC(10, 2),
  sync_success_rate NUMERIC(5, 2),
  error_rate NUMERIC(5, 2),
  average_sync_duration_ms INTEGER,
  consecutive_failures INTEGER,

  -- Counts
  total_syncs INTEGER,
  successful_syncs INTEGER,
  failed_syncs INTEGER,

  -- Issues and recommendations (JSON)
  issues JSONB,
  recommendations JSONB,

  -- Timing
  check_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT apl_health_metrics_scope_check CHECK (scope IN ('system', 'state')),
  CONSTRAINT apl_health_metrics_status_check CHECK (
    health_status IN ('healthy', 'degraded', 'unhealthy', 'critical')
  )
);

-- Indexes for health metrics
CREATE INDEX idx_apl_health_metrics_scope ON apl_health_metrics(scope);
CREATE INDEX idx_apl_health_metrics_state ON apl_health_metrics(state);
CREATE INDEX idx_apl_health_metrics_timestamp ON apl_health_metrics(check_timestamp DESC);
CREATE INDEX idx_apl_health_metrics_status ON apl_health_metrics(health_status);

-- ============================================================================
-- APL Monitor Alerts Table
-- Alerts generated by the monitoring system
-- ============================================================================

CREATE TABLE IF NOT EXISTS apl_monitor_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Alert identification
  alert_id VARCHAR(100) NOT NULL UNIQUE,

  -- Alert details
  severity VARCHAR(20) NOT NULL,
  state VARCHAR(2),
  message TEXT NOT NULL,
  details JSONB,

  -- Alert status
  acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  acknowledged_by VARCHAR(100),

  -- Resolution
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,

  -- Timing
  triggered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT apl_monitor_alerts_severity_check CHECK (
    severity IN ('info', 'warning', 'error', 'critical')
  )
);

-- Indexes for alerts
CREATE INDEX idx_apl_monitor_alerts_severity ON apl_monitor_alerts(severity);
CREATE INDEX idx_apl_monitor_alerts_state ON apl_monitor_alerts(state);
CREATE INDEX idx_apl_monitor_alerts_acknowledged ON apl_monitor_alerts(acknowledged);
CREATE INDEX idx_apl_monitor_alerts_resolved ON apl_monitor_alerts(resolved);
CREATE INDEX idx_apl_monitor_alerts_triggered_at ON apl_monitor_alerts(triggered_at DESC);

-- ============================================================================
-- Emergency Sync Requests Table
-- Tracks emergency/priority sync requests
-- ============================================================================

CREATE TABLE IF NOT EXISTS apl_emergency_sync_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Request identification
  request_id VARCHAR(100) NOT NULL UNIQUE,

  -- Request details
  reason VARCHAR(50) NOT NULL,
  priority VARCHAR(20) NOT NULL,
  states VARCHAR(2)[] NOT NULL,

  -- Request metadata
  requested_by VARCHAR(100) NOT NULL,
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  notes TEXT,
  metadata JSONB,

  -- Execution
  status VARCHAR(20) NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  duration_ms INTEGER,

  -- Results
  job_results JSONB,
  error_message TEXT,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT apl_emergency_sync_reason_check CHECK (
    reason IN ('formula_shortage', 'policy_change', 'manual_override',
               'data_corruption', 'push_notification', 'user_report', 'scheduled_check')
  ),
  CONSTRAINT apl_emergency_sync_priority_check CHECK (
    priority IN ('low', 'medium', 'high', 'critical')
  ),
  CONSTRAINT apl_emergency_sync_status_check CHECK (
    status IN ('pending', 'running', 'completed', 'failed')
  )
);

-- Indexes for emergency sync requests
CREATE INDEX idx_apl_emergency_sync_reason ON apl_emergency_sync_requests(reason);
CREATE INDEX idx_apl_emergency_sync_priority ON apl_emergency_sync_requests(priority);
CREATE INDEX idx_apl_emergency_sync_status ON apl_emergency_sync_requests(status);
CREATE INDEX idx_apl_emergency_sync_requested_at ON apl_emergency_sync_requests(requested_at DESC);

-- ============================================================================
-- Triggers for automatic timestamp updates
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_apl_sync_status_updated_at
  BEFORE UPDATE ON apl_sync_status
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_apl_monitor_alerts_updated_at
  BEFORE UPDATE ON apl_monitor_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_apl_emergency_sync_updated_at
  BEFORE UPDATE ON apl_emergency_sync_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Views for common queries
-- ============================================================================

-- View: Latest sync status per state
CREATE OR REPLACE VIEW vw_latest_apl_sync_status AS
SELECT DISTINCT ON (state)
  state,
  data_source,
  last_sync_at,
  last_sync_status,
  consecutive_failures,
  entries_processed,
  entries_added,
  entries_updated,
  EXTRACT(EPOCH FROM (NOW() - last_sync_at)) / 3600 AS age_hours
FROM apl_sync_status
ORDER BY state, last_sync_at DESC NULLS LAST;

-- View: Recent sync job summary
CREATE OR REPLACE VIEW vw_recent_sync_jobs AS
SELECT
  state,
  status,
  COUNT(*) AS job_count,
  SUM(entries_added) AS total_entries_added,
  SUM(entries_updated) AS total_entries_updated,
  AVG(duration_ms) AS avg_duration_ms,
  MAX(start_time) AS latest_run
FROM apl_sync_job_history
WHERE start_time >= NOW() - INTERVAL '7 days'
GROUP BY state, status
ORDER BY state, status;

-- View: Active alerts
CREATE OR REPLACE VIEW vw_active_alerts AS
SELECT
  alert_id,
  severity,
  state,
  message,
  triggered_at,
  EXTRACT(EPOCH FROM (NOW() - triggered_at)) / 3600 AS age_hours
FROM apl_monitor_alerts
WHERE acknowledged = FALSE
  AND resolved = FALSE
ORDER BY
  CASE severity
    WHEN 'critical' THEN 1
    WHEN 'error' THEN 2
    WHEN 'warning' THEN 3
    WHEN 'info' THEN 4
  END,
  triggered_at DESC;

-- ============================================================================
-- Initial data
-- ============================================================================

-- Insert initial sync status records for priority states
INSERT INTO apl_sync_status (state, data_source, last_sync_status)
VALUES
  ('MI', 'fis', 'pending'),
  ('NC', 'conduent', 'pending'),
  ('FL', 'fis', 'pending'),
  ('OR', 'state', 'pending')
ON CONFLICT (state, data_source) DO NOTHING;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE apl_sync_status IS 'Tracks APL data synchronization status for each state';
COMMENT ON TABLE apl_sync_job_history IS 'Detailed history of individual sync job executions';
COMMENT ON TABLE apl_monitor_checks IS 'History of update checks performed by the monitor';
COMMENT ON TABLE apl_health_metrics IS 'Health metrics and status over time';
COMMENT ON TABLE apl_monitor_alerts IS 'Alerts generated by the monitoring system';
COMMENT ON TABLE apl_emergency_sync_requests IS 'Emergency/priority sync request tracking';

COMMENT ON VIEW vw_latest_apl_sync_status IS 'Latest sync status per state with age calculation';
COMMENT ON VIEW vw_recent_sync_jobs IS 'Summary of sync jobs in the last 7 days';
COMMENT ON VIEW vw_active_alerts IS 'Currently active (unacknowledged and unresolved) alerts';

-- ============================================================================
-- Grant permissions (adjust as needed for your security model)
-- ============================================================================

-- Example: Grant to application user
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO wic_app_user;
-- GRANT SELECT ON ALL VIEWS IN SCHEMA public TO wic_app_user;
-- GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO wic_app_user;
