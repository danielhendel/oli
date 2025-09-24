# Topics
resource "google_pubsub_topic" "events_raw_v1" {
  name = "events.raw.v1"
  message_retention_duration = "1209600s" # 14 days
}

resource "google_pubsub_topic" "exports_requests_v1" {
  name = "exports.requests.v1"
}

resource "google_pubsub_topic" "account_delete_v1" {
  name = "account.delete.v1"
}

# Dead-letter topics
resource "google_pubsub_topic" "dlq_events_raw_v1" {
  name = "dlq.events.raw.v1"
}

resource "google_pubsub_topic" "dlq_exports_requests_v1" {
  name = "dlq.exports.requests.v1"
}

resource "google_pubsub_topic" "dlq_account_delete_v1" {
  name = "dlq.account.delete.v1"
}
