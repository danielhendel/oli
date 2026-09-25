/**
 * Stage 3C — Body metric detail display modes
 *
 * - Weight detail: mass (lb/kg) | BMI (derived from Weight × profile height)
 * - Body Fat detail: % | fat mass (compatible Weight × Body Fat %)
 * - Lean Mass detail: % | mass (Lean Mass / compatible Weight; never 100−BF)
 *
 * All derived views are presentation-only — no RawEvents, Firestore writes,
 * or Apple Health exports. Compatibility uses resolveCompatibleFatMassKg /
 * resolveCompatibleLeanMassPercentage. Lean Mass detail education removed for
 * parity with Weight and Body Fat detail pages; scientific registry/docs and
 * landing cards are unchanged.
 */
