# Phase 1 — Step 3 Backfill Replay Safety Proof

time: 2026-01-22T18:36:51Z

userId: 1Uwhcp4OShV3QLz3VKMHWo5B3033  
days: 2025-01-01, 2025-01-02

## IntelligenceContext verification
- path: users/{uid}/intelligenceContext/{day} ✅
- intelligenceContext.insights is an object with keys: bySeverity, count, ids, kinds, tags
  (not an array)

## Insights storage verification
- insights stored in: users/{uid}/insights
- query where date == day returned 0 docs for both days (valid)

## Replay safety snapshot
- Snapshot hash (normalized): 1bb60866dfcf52b8cce4092f8f32703fe314654b0f2fe0860f9b7cf30f4b2cc2
- Normalization ignores volatile fields:
  - computedAt
  - meta.computedAt

Evidence files:
- /tmp/step3_snap1.json
- /tmp/step3_snap2.json
