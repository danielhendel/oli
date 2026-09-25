/**
 * Stage 3C — Body metric detail display modes
 *
 * Physical runtime SHA: e4a23a552910f28241b10b25ae84b46529dab891 (PASS, 2026-09-25)
 *
 * - Weight detail: mass (lb/kg) | BMI (derived from Weight × profile height)
 * - Body Fat detail: % | fat mass (compatible Weight × Body Fat %)
 * - Lean Mass detail: % | mass (Lean Mass / compatible Weight; never 100−BF)
 *
 * All derived views are presentation-only — no RawEvents, Firestore writes,
 * or Apple Health exports. Compatibility uses resolveCompatibleFatMassKg /
 * resolveCompatibleLeanMassPercentage. Lean Mass detail education removed for
 * parity with Weight and Body Fat detail pages; scientific registry/docs and
 * landing cards are unchanged. Toggle layout contained inside page content insets.
 */
