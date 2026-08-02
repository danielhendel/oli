/**
 * Panel/unit-aware metric refinement after exact alias match.
 * Never fuzzy — only deterministic provider rules.
 */
export function refineLabMetricIdWithContext(args: {
  metricId: string | null;
  rawLabel: string;
  normalizedUnit: string | null;
  rawUnit: string | null;
}): string | null {
  const metricId = args.metricId;
  if (!metricId) return null;
  const label = args.rawLabel.trim().toLowerCase().replace(/\s+/g, " ");
  const unit = (args.normalizedUnit ?? args.rawUnit ?? "").trim().toLowerCase();

  // GLOBULIN: CMP serum globulin (g/dL) vs SHBG (nmol/L).
  if (
    (metricId === "serum_globulin" || metricId === "shbg") &&
    /^(globulin|globulin, serum|serum globulin)$/.test(label)
  ) {
    if (/nmol/.test(unit)) return "shbg";
    if (/g\/dl|g\/l/.test(unit)) return "serum_globulin";
  }

  // Osmolality specimen: (U) / urine → urine_osmolality; serum otherwise.
  if (
    metricId === "osmolality_serum" ||
    metricId === "osmolality_urine" ||
    /^osmolality/.test(label)
  ) {
    if (/\(u\)|\burine\b|osmolality u\b/.test(label)) return "osmolality_urine";
    if (/\bserum\b|\bplasma\b/.test(label)) return "osmolality_serum";
  }

  return metricId;
}
