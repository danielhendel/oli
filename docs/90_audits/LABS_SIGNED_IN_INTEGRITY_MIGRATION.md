# Labs signed-in integrity audit and derived-data reconciliation

Version: `labs_signed_in_reconciliation_v1`

## Purpose

Repair staging/signed-in Labs accounts where deleted uploads and prior parser
generations left orphan projections and threshold-as-result rows active.

## Ownership

- Original PDF + document metadata are immutable sources of truth.
- Derived rows (`labAcceptedResults`, `labResults` v2, drafts, reviews) may be
  deleted and rebuilt when parser-generated and not user-protected.
- User corrections / explicit acceptances / rejections are preserved.

## Tools (admin / local only)

```bash
# Read-only audit + optional safety export (writes outside repo)
GOOGLE_CLOUD_PROJECT=oli-staging-fdbba \
FIREBASE_STORAGE_BUCKET=oli-staging-fdbba.firebasestorage.app \
npx tsx --tsconfig scripts/tsconfig.json scripts/labs/labs-integrity-audit.cli.ts \
  --uid <uid> \
  --out-dir ~/oli-private/labs-integrity/<run-id> \
  --safety-export

# Apply migration only after SAFETY_EXPORT_VERIFIED and clean dry-run
... --apply-migrate --i-understand-mutate

# Optional single-document rebuild
npx tsx --tsconfig scripts/tsconfig.json scripts/labs/labs-reprocess-document.cli.ts \
  --uid <uid> --document-id <id>
```

Stdout is aggregates only. Private manifests must never be committed.

## Consumer history ownership

Metric detail and accepted history use `selectLabConsumerHistoryRows` /
`selectLabConsumerLatestResult`:

- exclude explicit reference roles and legacy reference-like inequalities;
- exclude inequality siblings of same-draw equality currents (Cardio IQ thresholds);
- collapse one point per document + metric + collected date + panel/specimen;
- latest selects by `collectedAt` then representative ranking (never by write time).

## Invariants (fail closed in migration plan)

- deleted/missing source → no active derived rows
- reference roles → not accepted/projected as consumer results
- user overrides → never auto-deleted
- migration dry-run blocks when manual review is required
