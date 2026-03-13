resource "grafana_dashboard" "wic_overview" {
  config_json = templatefile("${path.module}/dashboards/wic-overview.json", {
    ds_uid = var.prometheus_datasource_uid
  })
}
