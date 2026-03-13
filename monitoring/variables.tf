variable "grafana_url" {
  description = "Grafana Cloud instance URL (e.g. https://yourstack.grafana.net)"
  type        = string
}

variable "grafana_api_key" {
  description = "Grafana Cloud API key with editor permissions"
  type        = string
  sensitive   = true
}

variable "prometheus_datasource_uid" {
  description = "UID of the Grafana Cloud Prometheus data source (find in Connections > Data Sources)"
  type        = string
  default     = "grafanacloud-prom"
}

variable "notification_email" {
  description = "Email address for alert notifications"
  type        = string
  default     = ""
}
