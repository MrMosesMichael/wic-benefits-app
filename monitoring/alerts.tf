# Alert contact point
resource "grafana_contact_point" "email" {
  count = var.notification_email != "" ? 1 : 0

  name = "WIC Alerts Email"

  email {
    addresses = [var.notification_email]
  }
}

# Alert notification policy — route WIC alerts to email
resource "grafana_notification_policy" "wic" {
  count = var.notification_email != "" ? 1 : 0

  contact_point   = grafana_contact_point.email[0].name
  group_by        = ["alertname"]
  group_wait      = "30s"
  group_interval  = "5m"
  repeat_interval = "1h"
}

# Folder to organize alert rules
resource "grafana_folder" "wic_alerts" {
  title = "WIC Alerts"
}

# ── Alert Rules ────────────────────────────────────────────────────

resource "grafana_rule_group" "wic_backend" {
  name             = "WIC Backend Health"
  folder_uid       = grafana_folder.wic_alerts.uid
  interval_seconds = 60

  # 1. Backend down
  rule {
    name      = "Backend Down"
    condition = "threshold"

    data {
      ref_id = "A"

      relative_time_range {
        from = 300
        to   = 0
      }

      datasource_uid = var.prometheus_datasource_uid

      model = jsonencode({
        expr    = "up{job=\"prometheus.scrape.wic_backend\"}"
        refId   = "A"
        instant = true
      })
    }

    data {
      ref_id = "threshold"

      relative_time_range {
        from = 0
        to   = 0
      }

      datasource_uid = "__expr__"

      model = jsonencode({
        type       = "threshold"
        refId      = "threshold"
        expression = "A"
        conditions = [{
          evaluator = { type = "lt", params = [1] }
          operator  = { type = "and" }
          reducer   = { type = "last" }
        }]
      })
    }

    for            = "2m"
    no_data_state  = "Alerting"
    exec_err_state = "Error"
    annotations    = { summary = "WIC backend is unreachable" }
    labels         = { severity = "critical" }
  }

  # 2. High error rate (>5% 5xx responses over 5 minutes)
  rule {
    name      = "High Error Rate"
    condition = "threshold"

    data {
      ref_id = "A"

      relative_time_range {
        from = 300
        to   = 0
      }

      datasource_uid = var.prometheus_datasource_uid

      model = jsonencode({
        expr  = "sum(rate(http_requests_total{status_code=~\"5..\"}[5m])) / sum(rate(http_requests_total[5m]))"
        refId = "A"
      })
    }

    data {
      ref_id = "threshold"

      relative_time_range {
        from = 0
        to   = 0
      }

      datasource_uid = "__expr__"

      model = jsonencode({
        type       = "threshold"
        refId      = "threshold"
        expression = "A"
        conditions = [{
          evaluator = { type = "gt", params = [0.05] }
          operator  = { type = "and" }
          reducer   = { type = "last" }
        }]
      })
    }

    for            = "5m"
    no_data_state  = "OK"
    exec_err_state = "Error"
    annotations    = { summary = "More than 5% of requests are returning 5xx errors" }
    labels         = { severity = "warning" }
  }

  # 3. Slow responses (P95 > 2s over 5 minutes)
  rule {
    name      = "Slow Responses"
    condition = "threshold"

    data {
      ref_id = "A"

      relative_time_range {
        from = 300
        to   = 0
      }

      datasource_uid = var.prometheus_datasource_uid

      model = jsonencode({
        expr  = "histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))"
        refId = "A"
      })
    }

    data {
      ref_id = "threshold"

      relative_time_range {
        from = 0
        to   = 0
      }

      datasource_uid = "__expr__"

      model = jsonencode({
        type       = "threshold"
        refId      = "threshold"
        expression = "A"
        conditions = [{
          evaluator = { type = "gt", params = [2] }
          operator  = { type = "and" }
          reducer   = { type = "last" }
        }]
      })
    }

    for            = "5m"
    no_data_state  = "OK"
    exec_err_state = "Error"
    annotations    = { summary = "P95 response latency exceeds 2 seconds" }
    labels         = { severity = "warning" }
  }

  # 4. Database pool exhausted
  rule {
    name      = "DB Pool Exhausted"
    condition = "threshold"

    data {
      ref_id = "A"

      relative_time_range {
        from = 300
        to   = 0
      }

      datasource_uid = var.prometheus_datasource_uid

      model = jsonencode({
        expr  = "db_pool_connections_waiting"
        refId = "A"
      })
    }

    data {
      ref_id = "threshold"

      relative_time_range {
        from = 0
        to   = 0
      }

      datasource_uid = "__expr__"

      model = jsonencode({
        type       = "threshold"
        refId      = "threshold"
        expression = "A"
        conditions = [{
          evaluator = { type = "gt", params = [5] }
          operator  = { type = "and" }
          reducer   = { type = "last" }
        }]
      })
    }

    for            = "5m"
    no_data_state  = "OK"
    exec_err_state = "Error"
    annotations    = { summary = "Clients are waiting for database connections" }
    labels         = { severity = "warning" }
  }
}
