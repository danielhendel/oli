terraform {
  required_version = "= 1.7.5"
  required_providers {
    google = { source = "hashicorp/google", version = "~> 5.34" }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# Enable required services
resource "google_project_service" "services" {
  for_each = toset([
    "run.googleapis.com",
    "artifactregistry.googleapis.com",
    "pubsub.googleapis.com",
    "cloudbuild.googleapis.com",
    "logging.googleapis.com",
    "monitoring.googleapis.com",
    "firestore.googleapis.com",
    "iam.googleapis.com",
    "secretmanager.googleapis.com",
    "storage.googleapis.com"
  ])
  service = each.key
}
