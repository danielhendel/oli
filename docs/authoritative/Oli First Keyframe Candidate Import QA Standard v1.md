# Oli First Keyframe Candidate Import QA Standard v1

**Status:** Authoritative for first local keyframe candidate import  
**Version:** bench-press-keyframe-import-manifest-v1

---

## Purpose

Import externally generated Bench Press keyframe PNGs as local draft/dev-test M10 candidates and require human QA before any master approval.

---

## Expected local file path standard

16:9 master keyframes:

```
/media/exercises/bench_press/keyframes/setup-16x9.png
/media/exercises/bench_press/keyframes/start-lockout-16x9.png
/media/exercises/bench_press/keyframes/bottom-chest-pause-16x9.png
/media/exercises/bench_press/keyframes/finish-lockout-16x9.png
```

Repo paths:

```
apps/professional/public/media/exercises/bench_press/keyframes/{pose-slug}-16x9.png
```

---

## File presence must be repo-truth

`BENCH_PRESS_KEYFRAME_IMPORT_FILE_PRESENCE_V1` records whether each PNG exists.

- No `fs` in client code
- No fake `fileExists: true` without real PNG files in repo
- Update presence map only when files are actually added

---

## Imported candidates are draft/dev-test only

`buildMediaCandidateFromImageImport` creates:
- `draft` or `dev-test` status only
- `internal-dev-only` rights by default
- Not approval eligible until human QA completes

---

## No approved-master import

Import utilities reject `approved-master` intended status.

M15 does not promote candidates to approved-master.

---

## No backend / upload / CDN

Local manifest and metadata only. No Firestore, Storage, upload flows, or CDN.

---

## Relationships

| Sprint | Layer |
|--------|-------|
| M10 | Candidate Review |
| M11 | Image Pack (not approved from dev-test) |
| M14 | Production Packets + Import Manifest |
| M15 | Real local PNG import + Human QA worksheet |

Human QA is required before master approval.

---

## Human QA required before master approval

`buildCandidateImageQaWorksheet` and `buildBenchPressKeyframeCandidateQaWorksheet` provide checklists.

`buildCandidateImageQaReadiness` summarizes readiness — never outputs `approved-master`.
