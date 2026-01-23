# Phase 1 — Step 5.2 Runtime truth finalization

This document captures runtime truth for staging: project identity, Cloud Run service names, Functions gen/regions, and public invoker status for admin recompute endpoints.

CapturedAt: 2026-01-23T12:11:41Z

## GCP Project
{
  "labels": {
    "firebase": "enabled",
    "firebase-core": "disabled"
  },
  "name": "oli-staging",
  "projectId": "oli-staging-fdbba",
  "projectNumber": "1010034434203"
}

## Cloud Run services (us-central1)
NAME                                          URL                                                                           LATEST_READY_REVISION_NAME
oli-api                                       https://oli-api-7lrup47o4q-uc.a.run.app                                       oli-api-00072-qqb
onaccountdeleterequested                      https://onaccountdeleterequested-7lrup47o4q-uc.a.run.app                      onaccountdeleterequested-00005-wuk
onaccountexportrequested                      https://onaccountexportrequested-7lrup47o4q-uc.a.run.app                      onaccountexportrequested-00005-rub
oncanonicaleventcreated                       https://oncanonicaleventcreated-7lrup47o4q-uc.a.run.app                       oncanonicaleventcreated-00009-jif
ondailyfactsrecomputescheduled                https://ondailyfactsrecomputescheduled-7lrup47o4q-uc.a.run.app                ondailyfactsrecomputescheduled-00008-nir
ondailyintelligencecontextrecomputescheduled  https://ondailyintelligencecontextrecomputescheduled-7lrup47o4q-uc.a.run.app  ondailyintelligencecontextrecomputescheduled-00008-nep
oninsightsrecomputescheduled                  https://oninsightsrecomputescheduled-7lrup47o4q-uc.a.run.app                  oninsightsrecomputescheduled-00008-nac
onraweventcreated                             https://onraweventcreated-7lrup47o4q-uc.a.run.app                             onraweventcreated-00008-ruw
recomputedailyfactsadminhttp                  https://recomputedailyfactsadminhttp-7lrup47o4q-uc.a.run.app                  recomputedailyfactsadminhttp-00009-zot
recomputedailyintelligencecontextadminhttp    https://recomputedailyintelligencecontextadminhttp-7lrup47o4q-uc.a.run.app    recomputedailyintelligencecontextadminhttp-00009-vad
recomputeinsightsadminhttp                    https://recomputeinsightsadminhttp-7lrup47o4q-uc.a.run.app                    recomputeinsightsadminhttp-00009-nez

## Cloud Run API service details
{
  "metadata": {
    "labels": {
      "cloud.googleapis.com/location": "us-central1",
      "commit-sha": "5439bbf21c46ebced6fc21e57dbe94c0ed144daa",
      "gcb-build-id": "39724e0e-f301-4e55-8ece-3aa9ded2980b",
      "gcb-trigger-id": "c57fc2d0-4cdb-466d-9706-2b5a10d5cd37",
      "gcb-trigger-region": "global",
      "managed-by": "gcp-cloud-build-deploy-cloud-run"
    },
    "name": "oli-api"
  },
  "spec": {
    "template": {
      "spec": {
        "serviceAccountName": "oli-api-runtime@oli-staging-fdbba.iam.gserviceaccount.com"
      }
    }
  },
  "status": {
    "latestReadyRevisionName": "oli-api-00072-qqb",
    "url": "https://oli-api-7lrup47o4q-uc.a.run.app"
  }
}

## Cloud Run API revision image digest
REVISION_NAME=oli-api-00072-qqb
{
  "metadata": {
    "creationTimestamp": "2026-01-17T23:17:38.437758Z",
    "name": "oli-api-00072-qqb"
  },
  "spec": {
    "containers": [
      {
        "image": "us-central1-docker.pkg.dev/oli-staging-fdbba/cloud-run-source-deploy/oli-api@sha256:0e9de98b1a66631d9523aba6b7cd9b1d90d2dfc649a9ec574c892e9077d73485"
      }
    ]
  }
}

## Cloud Functions (Gen + Region + Runtime + URI)
NAME                                          REGION       ENVIRONMENT  RUNTIME   URI
onAccountDeleteRequested                      us-central1  GEN_2        nodejs20  https://onaccountdeleterequested-7lrup47o4q-uc.a.run.app
onAccountExportRequested                      us-central1  GEN_2        nodejs20  https://onaccountexportrequested-7lrup47o4q-uc.a.run.app
onAuthCreate                                  us-central1  GEN_1        nodejs20
onCanonicalEventCreated                       us-central1  GEN_2        nodejs20  https://oncanonicaleventcreated-7lrup47o4q-uc.a.run.app
onDailyFactsRecomputeScheduled                us-central1  GEN_2        nodejs20  https://ondailyfactsrecomputescheduled-7lrup47o4q-uc.a.run.app
onDailyIntelligenceContextRecomputeScheduled  us-central1  GEN_2        nodejs20  https://ondailyintelligencecontextrecomputescheduled-7lrup47o4q-uc.a.run.app
onInsightsRecomputeScheduled                  us-central1  GEN_2        nodejs20  https://oninsightsrecomputescheduled-7lrup47o4q-uc.a.run.app
onRawEventCreated                             us-central1  GEN_2        nodejs20  https://onraweventcreated-7lrup47o4q-uc.a.run.app
recomputeDailyFactsAdminHttp                  us-central1  GEN_2        nodejs20  https://recomputedailyfactsadminhttp-7lrup47o4q-uc.a.run.app
recomputeDailyIntelligenceContextAdminHttp    us-central1  GEN_2        nodejs20  https://recomputedailyintelligencecontextadminhttp-7lrup47o4q-uc.a.run.app
recomputeInsightsAdminHttp                    us-central1  GEN_2        nodejs20  https://recomputeinsightsadminhttp-7lrup47o4q-uc.a.run.app

## Admin recompute endpoints — Cloud Run invoker bindings (must be empty)

### recomputedailyfactsadminhttp
{
  "service": "recomputedailyfactsadminhttp",
  "invoker": []
}

### recomputeinsightsadminhttp
{
  "service": "recomputeinsightsadminhttp",
  "invoker": []
}

### recomputedailyintelligencecontextadminhttp
{
  "service": "recomputedailyintelligencecontextadminhttp",
  "invoker": []
}

## Runtime service accounts
EMAIL                                                              DISPLAY NAME
oli-staging-fdbba@appspot.gserviceaccount.com                      App Engine default service account
oli-ci-cloudrun-iam@oli-staging-fdbba.iam.gserviceaccount.com      CI Cloud Run IAM invariant checker
firebase-adminsdk-fbsvc@oli-staging-fdbba.iam.gserviceaccount.com  firebase-adminsdk
oli-functions-runtime@oli-staging-fdbba.iam.gserviceaccount.com    Oli Cloud Functions runtime (least privilege)
1010034434203-compute@developer.gserviceaccount.com                Default compute service account
oli-api-runtime@oli-staging-fdbba.iam.gserviceaccount.com          Oli API Cloud Run runtime
oli-eventarc-invoker@oli-staging-fdbba.iam.gserviceaccount.com     Eventarc trigger invoker for Oli Functions (least privilege)

## Storage buckets (staging)
---
cors_config:
- method:
  - GET
  origin:
  - https://*.cloud.google.com
  - https://*.corp.google.com
  - https://*.corp.google.com:*
  - https://*.cloud.google
  - https://*.byoid.goog
creation_time: 2025-12-30T18:28:58+0000
default_storage_class: STANDARD
generation: 1767119338616386654
labels:
  goog-managed-by: cloudfunctions
location: US-CENTRAL1
location_type: region
metageneration: 1
name: gcf-sources-1010034434203-us-central1
public_access_prevention: inherited
soft_delete_policy:
  effectiveTime: '2025-12-30T18:28:58.752000+00:00'
  retentionDurationSeconds: '604800'
storage_url: gs://gcf-sources-1010034434203-us-central1/
uniform_bucket_level_access: true
update_time: 2025-12-30T18:28:58+0000
---
cors_config:
- method:
  - GET
  origin:
  - https://*.cloud.google.com
  - https://*.corp.google.com
  - https://*.corp.google.com:*
  - https://*.cloud.google
  - https://*.byoid.goog
creation_time: 2025-12-30T18:28:57+0000
default_storage_class: STANDARD
generation: 1767119337769722366
labels:
  goog-managed-by: cloudfunctions
lifecycle_config:
  rule:
  - action:
      type: Delete
    condition:
      isLive: false
      numNewerVersions: 3
location: US-CENTRAL1
location_type: region
metageneration: 2
name: gcf-v2-sources-1010034434203-us-central1
public_access_prevention: inherited
soft_delete_policy:
  effectiveTime: '2025-12-30T18:28:57.992000+00:00'
  retentionDurationSeconds: '604800'
storage_url: gs://gcf-v2-sources-1010034434203-us-central1/
uniform_bucket_level_access: true
update_time: 2026-01-20T21:05:34+0000
versioning_enabled: true
---
cors_config:
- method:
  - PUT
  origin:
  - https://*.cloud.google.com
  - https://*.corp.google.com
  - https://*.corp.google.com:*
  - https://*.cloud.google
  - https://*.byoid.goog
  responseHeader:
  - content-type
creation_time: 2025-12-30T18:28:45+0000
default_storage_class: STANDARD
generation: 1767119325736781970
labels:
  goog-managed-by: cloudfunctions
lifecycle_config:
  rule:
  - action:
      type: Delete
    condition:
      age: 1
location: US-CENTRAL1
location_type: region
metageneration: 1
name: gcf-v2-uploads-1010034434203.us-central1.cloudfunctions.appspot.com
public_access_prevention: inherited
soft_delete_policy:
  effectiveTime: '2025-12-30T18:28:45.805000+00:00'
  retentionDurationSeconds: '604800'
storage_url: gs://gcf-v2-uploads-1010034434203.us-central1.cloudfunctions.appspot.com/
uniform_bucket_level_access: true
update_time: 2025-12-30T18:28:45+0000
---
creation_time: 2026-01-07T00:04:55+0000
default_storage_class: STANDARD
generation: 1767744295134684741
lifecycle_config:
  rule:
  - action:
      type: Delete
    condition:
      age: 30
location: US-CENTRAL1
location_type: region
metageneration: 3
name: oli-staging-fdbba-staging-data-exports
public_access_prevention: inherited
soft_delete_policy:
  effectiveTime: '2026-01-07T00:04:55.186000+00:00'
  retentionDurationSeconds: '604800'
storage_url: gs://oli-staging-fdbba-staging-data-exports/
uniform_bucket_level_access: true
update_time: 2026-01-11T14:41:27+0000
---
creation_time: 2025-10-01T16:39:00+0000
default_storage_class: STANDARD
generation: 1759336740723322917
location: US-CENTRAL1
location_type: region
metageneration: 1
name: oli-staging-fdbba-storage
public_access_prevention: enforced
soft_delete_policy:
  effectiveTime: '2025-10-01T16:39:00.902000+00:00'
  retentionDurationSeconds: '604800'
storage_url: gs://oli-staging-fdbba-storage/
uniform_bucket_level_access: true
update_time: 2025-10-01T16:39:00+0000
---
acl:
- entity: project-owners-1010034434203
  projectTeam:
    projectNumber: '1010034434203'
    team: owners
  role: OWNER
- entity: project-editors-1010034434203
  projectTeam:
    projectNumber: '1010034434203'
    team: editors
  role: OWNER
- entity: project-viewers-1010034434203
  projectTeam:
    projectNumber: '1010034434203'
    team: viewers
  role: READER
creation_time: 2025-10-01T16:43:58+0000
default_acl:
- entity: project-owners-1010034434203
  projectTeam:
    projectNumber: '1010034434203'
    team: owners
  role: OWNER
- entity: project-editors-1010034434203
  projectTeam:
    projectNumber: '1010034434203'
    team: editors
  role: OWNER
- entity: project-viewers-1010034434203
  projectTeam:
    projectNumber: '1010034434203'
    team: viewers
  role: READER
default_storage_class: REGIONAL
generation: 1759337038828913443
location: US-CENTRAL1
location_type: region
metageneration: 1
name: oli-staging-fdbba.firebasestorage.app
public_access_prevention: inherited
soft_delete_policy:
  effectiveTime: '2025-10-01T16:43:58.932000+00:00'
  retentionDurationSeconds: '604800'
storage_url: gs://oli-staging-fdbba.firebasestorage.app/
uniform_bucket_level_access: false
update_time: 2025-10-01T16:43:58+0000
---
acl:
- entity: project-owners-1010034434203
  projectTeam:
    projectNumber: '1010034434203'
    team: owners
  role: OWNER
- entity: project-editors-1010034434203
  projectTeam:
    projectNumber: '1010034434203'
    team: editors
  role: OWNER
- entity: project-viewers-1010034434203
  projectTeam:
    projectNumber: '1010034434203'
    team: viewers
  role: READER
creation_time: 2026-01-04T18:32:27+0000
default_acl:
- entity: project-owners-1010034434203
  projectTeam:
    projectNumber: '1010034434203'
    team: owners
  role: OWNER
- entity: project-editors-1010034434203
  projectTeam:
    projectNumber: '1010034434203'
    team: editors
  role: OWNER
- entity: project-viewers-1010034434203
  projectTeam:
    projectNumber: '1010034434203'
    team: viewers
  role: READER
default_storage_class: STANDARD
generation: 1767551547720132724
location: US
location_type: multi-region
metageneration: 1
name: oli-staging-fdbba_cloudbuild
public_access_prevention: inherited
rpo: DEFAULT
soft_delete_policy:
  effectiveTime: '2026-01-04T18:32:27.993000+00:00'
  retentionDurationSeconds: '604800'
storage_url: gs://oli-staging-fdbba_cloudbuild/
uniform_bucket_level_access: false
update_time: 2026-01-04T18:32:27+0000
---
cors_config:
- method:
  - GET
  origin:
  - https://*.cloud.google.com
  - https://*.corp.google.com
  - https://*.corp.google.com:*
  - https://*.cloud.google
  - https://*.byoid.goog
creation_time: 2025-12-23T19:02:00+0000
default_storage_class: STANDARD
generation: 1766516520041654241
location: US-CENTRAL1
location_type: region
metageneration: 2
name: run-sources-oli-staging-fdbba-us-central1
public_access_prevention: inherited
soft_delete_policy:
  effectiveTime: '2025-12-23T19:02:00.175000+00:00'
  retentionDurationSeconds: '604800'
storage_url: gs://run-sources-oli-staging-fdbba-us-central1/
uniform_bucket_level_access: true
update_time: 2026-01-17T20:19:33+0000
