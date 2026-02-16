#############################################
# Pub/Sub — Normalizer Subscriptions ONLY
# (Topics are defined in pubsub.tf)
#############################################

# Expected existing topics in pubsub.tf:
#  - google_pubsub_topic.events_raw_v1           (name = "events.raw.v1")
#  - google_pubsub_topic.exports_requests_v1     (name = "exports.requests.v1")
#  - google_pubsub_topic.account_delete_v1       (name = "account.delete.v1")

resource "google_pubsub_subscription" "events_raw_v1_normalizer" {
  name                       = "events.raw.v1.normalizer"
  topic                      = google_pubsub_topic.events_raw_v1.name
  ack_deadline_seconds       = 20
  message_retention_duration = "604800s" # 7 days
  retain_acked_messages      = false
}

resource "google_pubsub_subscription" "exports_requests_v1_normalizer" {
  name                       = "exports.requests.v1.normalizer"
  topic                      = google_pubsub_topic.exports_requests_v1.name
  ack_deadline_seconds       = 20
  message_retention_duration = "604800s"
  retain_acked_messages      = false
}

resource "google_pubsub_subscription" "account_delete_v1_normalizer" {
  name                       = "account.delete.v1.normalizer"
  topic                      = google_pubsub_topic.account_delete_v1.name
  ack_deadline_seconds       = 20
  message_retention_duration = "604800s"
  retain_acked_messages      = false
}
