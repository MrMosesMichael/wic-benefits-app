terraform {
  required_version = ">= 1.7.0"

  # To use Terraform Cloud, uncomment and run `terraform init`:
  # cloud {
  #   organization = "observability-lab"
  #   workspaces {
  #     name = "wic-monitoring"
  #   }
  # }

  required_providers {
    grafana = {
      source  = "grafana/grafana"
      version = "~> 3.0"
    }
  }
}

provider "grafana" {
  url  = var.grafana_url
  auth = var.grafana_api_key
}
