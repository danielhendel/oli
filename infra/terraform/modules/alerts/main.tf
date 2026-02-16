#############################################
# Cloud Run 5xx — Log-based metric + alert
# (DLQ alerts are defined in infra/alerts_dlq.tf)
#############################################

# Log-based metric: count of Cloud Run 5xx responses
resource "google_logging_metric" "run_5xx" {
  name   = "cloudrun_5xx_count"
  filter = "resource.type=\"cloud_run_revision\" AND (httpRequest.status>=500 AND httpRequest.status<600)"

  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "INT64"
  }
}

# Alert policy for spikes in Cloud Run 5xx
resource "google_monitoring_alert_policy" "run_5xx" {
  display_name = "Cloud Run 5xx spike"
  combiner     = "OR"
  enabled      = true

  # Helpful labels for routing & dashboards
  user_labels = {
    env         = var.env
    system      = "cloudrun"
    purpose     = "http-5xx"
    severity    = "warning"
    owning_team = "backend"
  }

  documentation {
    content   = <<-EOT
      **What happened**
      Cloud Run is emitting HTTP 5xx responses above the threshold.

      **Why it matters**
      5xx errors indicate server-side failures and can impact availability and user experience.

      **What to do**
      1) Check recent deploys and error logs in Cloud Run for the affected service(s).
      2) Roll back if a recent release correlates with the spike.
      3) Investigate dependencies (datastore, Pub/Sub, third-party APIs).

      _Policy: rate of 5xx > 1 req/sec for 5 minutes._
    EOT
    mime_type = "text/markdown"
  }

  conditions {
    display_name = "5xx over threshold (rate > 1/s for 5m)"

    condition_threshold {
      # Use the log-based metric created above
      filter = "metric.type=\"logging.googleapis.com/user/${google_logging_metric.run_5xx.name}\""

      # Align to 60s buckets and convert to a per-second rate
      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_RATE"
      }

      comparison      = "COMPARISON_GT"
      threshold_value = 1
      duration        = "300s" # 5 minutes

      trigger {
        count = 1
      }
    }
  }

  # Avoid alert storms; auto-close stale incidents
  alert_strategy {
    auto_close = "604800s" # 7 days

    notification_rate_limit {
      period = "300s" # at most one notification every 5 minutes
    }
  }

  # Wire up from module input; can be an empty list
  notification_channels = var.notification_channels
}
