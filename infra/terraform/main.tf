terraform {
  required_providers {
    google = { source = "hashicorp/google", version = ">= 5.28" }
  }
}

provider "google" {
  project = var.project
  region  = var.region
}

module "pubsub" {
  source = "./modules/pubsub"

  project        = var.project
  pubsub_push_sa = var.pubsub_push_sa

  api_push_url        = "${var.api_service_url}/_ah/push" # optional if you later want API push
  normalizer_push_url = "${var.normalizer_service_url}/_ah/push"
  exporter_push_url   = "${var.exporter_service_url}/_ah/push"
  deleter_push_url    = "${var.deleter_service_url}/_ah/push"
}

module "alerts" {
  source  = "./modules/alerts"
  project = var.project
  services = [
    "api", "normalizer", "exporter", "deleter"
  ]
}
