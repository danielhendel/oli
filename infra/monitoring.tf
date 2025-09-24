# Example alert: high error rate on Cloud Run (customize after metrics settle)
resource "google_monitoring_alert_policy" "api_5xx_rate" {
  display_name = "API 5xx rate high"
  combiner     = "OR"
  conditions {
    display_name = "5xx ratio > 2% for 5m"
    condition_threshold {
      filter          = "metric.type=\"run.googleapis.com/request_count\" resource.type=\"cloud_run_revision\" metric.label.\"response_code_class\"=\"5xx\""
      comparison      = "COMPARISON_GT"
      duration        = "300s"
      threshold_value = 0
      trigger { count = 1 }
    }
  }
  notification_channels = [] # plug in later
  enabled = true
}
