output "api_uri" {
  value = google_cloud_run_v2_service.api.uri
}
output "exports_bucket" {
  value = google_storage_bucket.data_exports.name
}
output "topic_events_raw" {
  value = google_pubsub_topic.events_raw_v1.name
}
