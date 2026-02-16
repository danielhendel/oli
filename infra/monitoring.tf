resource "google_monitoring_alert_policy" "api_5xx_rate" {
  project      = var.project_id
  display_name = "API 5xx rate high"
  combiner     = "OR"
  enabled      = true

  conditions {
    display_name = "5xx rate > 0 for 5m"

    condition_threshold {
      filter          = "metric.type=\"run.googleapis.com/request_count\" resource.type=\"cloud_run_revision\" metric.label.\"response_code_class\"=\"5xx\""
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = 0

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_RATE"
      }

      trigger { count = 1 }
    }
  }
}
