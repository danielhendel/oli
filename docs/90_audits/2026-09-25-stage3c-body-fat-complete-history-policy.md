/**
 * Stage 3C — Body Fat complete Apple Health history policy
 *
 * Leadership decision (physical evidence Sep 25, 2026):
 *
 * - Apple Health “All Recorded Data” shows Body Fat from **2017-06-10**
 *   (also 2024 / 2025 / 2026 samples).
 * - Oli pre-fix stored / trend / rendered oldest Body Fat was **2026-07-28**
 *   with `pagesLoaded = 5` — chart was rendering all *stored* history.
 * - First truncation layer: HealthKit → Body Fat historical import / checkpoint
 *   / ingest → Oli stored history (not chart filtering).
 * - `HEALTHKIT_DATA_NOT_AVAILABLE` is ruled out.
 *
 * Product policy:
 *
 * - **5Y** = most recent five years of valid stored Body Fat observations.
 * - **All** = all available governed Body Fat history (not mapped to 5Y).
 * - Body Fat Apple Health **import is not capped at five years**; it must reach
 *   the earliest available HealthKit Body Fat sample (search floor:
 *   `APPLE_HEALTH_EARLIEST_SAFE_BOUNDARY_ISO` = 2014-09-01, or DOB when later).
 * - Body Fat history checkpoint is **UID-scoped and metric-specific**
 *   (`appleHealth:bodyFatBackfillState:{uid}`) so Weight completion cannot
 *   falsely mark Body Fat complete.
 * - Page pull-to-refresh remains **latest-only** (`body_page_pull_refresh`).
 * - Explicit sheet action: **Import / Resume Body Fat history**.
 *
 * Chunk strategy: half-year (~182d) Body Fat–only windows; empty years continue;
 * saturated 500-sample windows are bisected. Ascending limit-1 discovery is
 * preferred; chunk scan is the reliable fallback for sparse history.
 */
