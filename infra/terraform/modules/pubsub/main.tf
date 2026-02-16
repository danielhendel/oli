#############################################
# Pub/Sub module resources
#############################################

# Example topic and subscription resources (keep whatever you already had,
# just ensure nested blocks are multi-line, not single-line).

# (If you already define topics elsewhere, do not duplicate them here.)

# Example subscription with proper multi-line nested blocks:
resource "google_pubsub_subscription" "events_to_normalizer" {
  name  = "events.to.normalizer"
  topic = google_pubsub_topic.events_raw_v1.name

  ack_deadline_seconds       = 20
  message_retention_duration = "604800s"
  retain_acked_messages      = false

  retry_policy {
    minimum_backoff = "10s"
    maximum_backoff = "600s"
  }

  # If you have these blocks, ensure they’re multi-line too:
  # dead_letter_policy {
  #   dead_letter_topic     = google_pubsub_topic.events_raw_v1_dlq.id
  #   max_delivery_attempts = 10
  # }
  #
  # push_config {
  #   oidc_token {
  #     service_account_email = "push-sub@PROJECT_ID.iam.gserviceaccount.com"
  #     audience              = "https://example.run.app"
  #   }
  #   # Or push_config with attributes if you use HTTP push
  # }
}
