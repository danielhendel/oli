variable "project_id" {
  type        = string
  description = "GCP project ID used for all resources (e.g., healthos-prod-1234)."
}

variable "region" {
  type    = string
  default = "us-central1"
}


variable "api_image" {
  type        = string
  description = "Artifact Registry image URL for the API (e.g., us-central1-docker.pkg.dev/PROJECT/repo/healthos-api:latest)."
}

variable "env" {
  type        = string
  description = "Deployment environment label (e.g., dev, staging, prod)."
  default     = "dev"
}

variable "cloud_run_invoker_member" {
  type        = string
  description = "Principal allowed to invoke the Cloud Run service (least privilege). Example: serviceAccount:oli-ci-invoker@PROJECT.iam.gserviceaccount.com"

  validation {
    condition     = can(regex("^serviceAccount:[^@]+@[^@]+\\.iam\\.gserviceaccount\\.com$", var.cloud_run_invoker_member))
    error_message = "cloud_run_invoker_member must be a service account in the form 'serviceAccount:<name>@<project>.iam.gserviceaccount.com'."
  }
}

variable "notification_channels" {
  type        = list(string)
  description = "List of Cloud Monitoring notification channel IDs used by alert policies."
  default     = []
}
