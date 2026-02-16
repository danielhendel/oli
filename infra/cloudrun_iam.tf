# infra/cloudrun_iam.tf

# REMOVE the public invoker block (if it still exists):
# resource "google_cloud_run_v2_service_iam_member" "public_invoker" {
#   project  = var.project_id
#   location = "us-central1"
#   name     = google_cloud_run_v2_service.api.name
#   role     = "roles/run.invoker"
#   member   = "allUsers"
#   depends_on = [google_cloud_run_v2_service.api]
# }

# ADD: least-privileged invoker (CI or probe service account)
resource "google_cloud_run_v2_service_iam_member" "authorized_invoker" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.api.name
  role     = "roles/run.invoker"
  member   = var.cloud_run_invoker_member # e.g., "serviceAccount:oli-ci-invoker@<PROJECT>.iam.gserviceaccount.com"
}
