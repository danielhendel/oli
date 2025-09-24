variable "project_id" { type = string }
variable "region"     { type = string  default = "us-central1" }
variable "api_image"  { type = string  description = "Artifact Registry image URL for API, e.g. us-central1-docker.pkg.dev/PROJECT/repo/healthos-api:latest" }
variable "env"        { type = string  default = "dev" }
