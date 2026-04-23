# Bundled exercise usage export (Firestore read-only)

This produces JSON artifacts listing **bundled catalog** exercises that appear in real strength workout history (`users/{uid}/rawEvents`, `kind === "strength_workout"`), versus **unused** bundled ids after subtracting **ambiguous** ids (`bundledExerciseArchiveAudit.ts`). Nothing is archived or modified.

## Preconditions

- **GCP / Firebase auth**: Application Default Credentials (ADC), e.g.  
  `gcloud auth application-default login`  
  or `GOOGLE_APPLICATION_CREDENTIALS` pointing at a service account JSON with **Firestore read** on the target project.
- **Correct project**: Prefer `FIREBASE_PROJECT_ID`, then `GOOGLE_CLOUD_PROJECT`, then `GCLOUD_PROJECT`, then `--project-id`. If none are set, the CLI uses **`.firebaserc` → `projects.staging`** (`oli-staging-fdbba` in this repo). Do **not** paste doc placeholders such as `your-staging-project-id` into shell env—they are detected and ignored in favor of `.firebaserc`. Mis-set credentials for the chosen project → permission errors.
- **Firestore composite index**: Query uses `where kind == strength_workout` + `orderBy observedAt asc`. If Firestore returns `FAILED_PRECONDITION` with an index URL, create that index (staging first), then rerun.

## Run (staging recommended first)

From repo root:

```bash
# Optional: explicit project (otherwise .firebaserc staging or FIREBASE_PROJECT_ID etc.)
npm run export:bundled-exercise-usage -- \
  --project-id oli-staging-fdbba \
  --uid <FirebaseAuthUid> \
  --out-dir ./artifacts/bundled-exercise-usage
```

If you invoke **tsx** directly (not via `npm run`), pass **`--tsconfig scripts/tsconfig.json`** so `@/` path aliases resolve the same way as Metro/Jest (`parseWorkoutFromRawEvent.ts` imports `@/lib/...`).

Optional:

- `--project-id <id>` — explicit project (overrides env). Env order otherwise: `FIREBASE_PROJECT_ID`, `GOOGLE_CLOUD_PROJECT`, `GCLOUD_PROJECT`, then `.firebaserc` `staging`.
- `--skip-custom-definitions` — skips `users/{uid}/exerciseDefinitions`; resolution will not match production as closely for custom-linked rows (prefer loading definitions unless debugging).
- `--max-raw-events N` — cap documents for smoke tests only; **not** for a full audit.

## Outputs

Under `--out-dir` (default `./artifacts/bundled-exercise-usage`, gitignored):

| File | Purpose |
|------|---------|
| `used-bundled-exercise-ids.json` | Bundled ids seen after analytics resolution; includes stable ids, all logged names, and legacy name→id maps for traceability |
| `unresolved-legacy-exercise-names.json` | Names on synthetic `exercise:ingested:*` rows that did not resolve to a bundled catalog id |
| `ambiguous-bundled-exercise-ids.json` | Ids excluded from “unused for archive” (`bundledExerciseIdsAmbiguousForAutoArchive`) |
| `unused-bundled-exercise-ids.json` | Library catalog minus used minus ambiguous (custom ids never appear here by construction) |

## Safety

- **Read-only**: no writes to Firestore.
- **PII-adjacent**: Filenames may embed `uid` in paths inside JSON metadata; treat `out-dir` as sensitive; do not commit.

## Prod

Repeat with production project id and the target user uid. Confirm counts and spot-check a few exercises in `used-bundled-exercise-ids.json` against the Firestore console before any archive step elsewhere.
