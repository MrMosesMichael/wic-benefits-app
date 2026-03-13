output "dashboard_url" {
  description = "URL to the WIC Overview dashboard"
  value       = grafana_dashboard.wic_overview.url
}

output "alert_folder" {
  description = "Grafana folder containing WIC alert rules"
  value       = grafana_folder.wic_alerts.title
}
