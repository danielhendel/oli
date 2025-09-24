# Service account for API
resource "google_service_account" "api_sa" {
  account_id   = "healthos-api"
  display_name = "HealthOS API Service Account"
}

# Permissions: publish to topics + access storage
resource "google_project_iam_member" "api_pubsub_publisher" {
  project = var.project_id
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:${google_service_account.api_sa.email}"
}

resource "google_project_iam_member" "api_storage_writer" {
  project = var.project_id
  role    = "roles/storage.objectUser"
  member  = "serviceAccount:${google_service_account.api_sa.email}"
}
