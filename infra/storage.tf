resource "google_storage_bucket" "data_exports" {
  name                        = "${var.project_id}-${var.env}-data-exports"
  location                    = var.region
  force_destroy               = false
  uniform_bucket_level_access = true

  lifecycle_rule {
    action { type = "Delete" }
    condition { age = 30 } # keep exports for 30 days
  }

  labels = { env = var.env, app = "healthos" }
}
