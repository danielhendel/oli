# Oli Candidate Image Production Workflow Standard v1

**Status:** Authoritative for Top 25 candidate image production workflow  
**Version:** candidate-image-production-v1

---

## Purpose

Define the controlled local workflow from validated keyframe specs to external image generation and M10 candidate import.

---

## Production packets are local/external instructions

`CandidateImageProductionPacket` objects contain:
- Google Flow prompt packets
- Expected import paths
- QA/acceptance criteria
- Blocked reasons when expert review is incomplete

They do **not** create images, candidates, or approved media.

---

## Google Flow is external only

Prompt packets are deterministic text for manual/external Google Flow use.

No AI API calls. No Google Flow SDK integration in M14.

---

## Import manifest standard

`buildCandidateImageImportManifest` maps production packets to expected repo paths:

```
apps/professional/public/media/exercises/{exerciseId}/keyframes/{poseId}-{renderTargetSlug}.png
```

Public path:

```
/media/exercises/{exerciseId}/keyframes/{poseId}-{renderTargetSlug}.png
```

Manifest does not write files or upload.

---

## Draft/dev-test import status

`buildMediaCandidateFromImageImport` creates M10 candidates with status:
- `draft`
- `dev-test`

Never `approved-master`.

---

## No approved-master import rule

Import utilities reject `approved-master` intended status.

Imported candidates require M10 QA before any master approval.

---

## Relationships

| Layer | Sprint |
|-------|--------|
| Candidate Review | M10 |
| Image Pack | M11 |
| Keyframe Spec | M13 |
| Expert Review + Production Workflow | M14 |

Image packs are not approved by M14.

---

## Do-not-build-yet

- Backend upload / Firestore / Storage
- CDN delivery
- Real asset approval
- Image pack approval
- Video from approved keyframes
