#############################################
# Alert: DLQ depth > 0 for 5 minutes
# (Metric threshold alerts — no notification_rate_limit)
#############################################

locals {
  dlq_subscriptions = {
    events_raw = "events.raw.v1.dlq"
    exports    = "exports.requests.v1.dlq"
    deleter    = "account.delete.v1.dlq"
  }
}

resource "google_monitoring_alert_policy" "dlq_nonempty" {
  for_each     = local.dlq_subscriptions
  display_name = "DLQ depth alert: ${each.value}"
  combiner     = "OR"
  enabled      = true

  user_labels = {
    env         = var.env
    system      = "pubsub"
    purpose     = "dlq-depth"
    owning_team = "backend"
    severity    = "warning"
  }

  documentation {
    content   = <<-EOT
      **What happened**  
      The Pub/Sub DLQ subscription **${each.value}** has undelivered messages for at least 5 minutes.

      **Why it matters**  
      Messages are failing to process and are being routed to the dead-letter queue. This indicates a persistent consumer error, schema mismatch, or permissions misconfiguration.

      **What to do**
      1) Inspect errors in the consumer service logs (Cloud Run / GKE).
      2) Check recent pushes/pulls and dead-letter policy on the main subscription.
      3) Reprocess DLQ messages once the underlying issue is fixed.

      _Policy: Trigger when `num_undelivered_messages > 0` for 300s._
    EOT
    mime_type = "text/markdown"
  }

  conditions {
    display_name = "${each.value} depth > 0 (5m)"
    condition_threshold {
      filter          = "resource.type=pubsub_subscription AND resource.label.subscription_id=\"${each.value}\" AND metric.type=\"pubsub.googleapis.com/subscription/num_undelivered_messages\""
      duration        = "300s" # 5 minutes
      comparison      = "COMPARISON_GT"
      threshold_value = 0
      trigger { count = 1 }
    }
  }

  # Allowed for metric-based alerts: keep auto_close
  alert_strategy {
    auto_close = "604800s" # 7 days
  }

  notification_channels = var.notification_channels
}
