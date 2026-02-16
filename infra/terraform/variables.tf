# Shared variables for terraform/* modules

variable "region" {
  type    = string
  default = "us-central1"
}

# If you have other single-line variable blocks in this file, expand them too.
# Example patterns:
#
# variable "env" {
#   type    = string
#   default = "dev"
# }
#
# variable "notification_channels" {
#   type    = list(string)
#   default = []
# }
