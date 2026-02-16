resource "google_cloud_run_v2_service" "api" {
  name     = "healthos-api"
  location = var.region

  template {
    service_account = google_service_account.api_sa.email

    containers {
      image = var.api_image

      env {
        name  = "GOOGLE_CLOUD_PROJECT"
        value = var.project_id
      }

      env {
        name  = "REGION"
        value = var.region
      }

      env {
        name  = "EXPORTS_BUCKET"
        value = google_storage_bucket.data_exports.name
      }

      env {
        name  = "TOPIC_EVENTS_RAW"
        value = google_pubsub_topic.events_raw_v1.name
      }

      env {
        name  = "TOPIC_EXPORTS"
        value = google_pubsub_topic.exports_requests_v1.name
      }

      env {
        name  = "TOPIC_DELETE"
        value = google_pubsub_topic.account_delete_v1.name
      }

      env {
        name  = "NODE_ENV"
        value = var.env
      }

      resources {
        cpu_idle = true
      }

      ports {
        container_port = 8080
      }
    }

    scaling {
      min_instance_count = 0
      max_instance_count = 3
    }
  }

  ingress = "INGRESS_TRAFFIC_ALL"
  labels  = { env = var.env, app = "healthos" }
}
