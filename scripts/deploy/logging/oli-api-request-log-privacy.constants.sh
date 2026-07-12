# Source-controlled constants for Oli API/Gateway request-log privacy exclusion.
# Do not put secrets, UIDs, query values, or raw URLs in this file.

OLI_REQUEST_LOG_PRIVACY_ALLOWED_PROJECT="oli-staging-fdbba"
OLI_REQUEST_LOG_PRIVACY_SINK_NAME="_Default"
OLI_REQUEST_LOG_PRIVACY_REQUIRED_SINK_NAME="_Required"
OLI_REQUEST_LOG_PRIVACY_EXCLUSION_NAME="oli_api_request_metadata_privacy_v1"
OLI_REQUEST_LOG_PRIVACY_EXCLUSION_DESCRIPTION="Privacy: prevent storage of Oli API/Gateway request metadata that may contain health-range values, API keys, concrete identifiers, or legacy authenticated request metadata."
OLI_REQUEST_LOG_PRIVACY_CLAUSE_COUNT="4"
