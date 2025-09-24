resource "google_artifact_registry_repository" "healthos_repo" {
  location      = var.region
  repository_id = "healthos"
  format        = "DOCKER"
  description   = "HealthOS container images"
  labels        = { app = "healthos", env = var.env }
}

# Allow the Cloud Run service account to read images
resource "google_project_iam_member" "api_artifact_reader" {
  project = var.project_id
  role    = "roles/artifactregistry.reader"
  member  = "serviceAccount:${google_service_account.api_sa.email}"
}
