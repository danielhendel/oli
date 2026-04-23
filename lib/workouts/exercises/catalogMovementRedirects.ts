/**
 * Deterministic movement → bundled id fallbacks when normalized text does not match
 * `EXERCISE_LIBRARY_V1` name/alias keys (after `normalizeExerciseNameForCatalogLookup`).
 * No fuzzy logic: explicit string / keyword rules only, stable ordering.
 */

/** Called only after the static catalog map misses. */
export function resolveDeterministicMovementRedirect(normalizedKey: string): string | null {
  const k = normalizedKey.trim();
  if (k.length === 0) return null;

  // --- Exact phrases (after brand/machine stripping) ---
  const exact = EXACT_NORMALIZED_KEY_TO_EXERCISE_ID.get(k);
  if (exact != null) return exact;

  // --- Keyword-scoped rules (order: more specific patterns first) ---
  const bicep = resolveBicepCurlFamily(k);
  if (bicep != null) return bicep;

  const chest = resolveChestPressFamily(k);
  if (chest != null) return chest;

  const row = resolveRowFamily(k);
  if (row != null) return row;

  const tri = resolveTricepPushdownFamily(k);
  if (tri != null) return tri;

  return null;
}

const EXACT_NORMALIZED_KEY_TO_EXERCISE_ID: ReadonlyMap<string, string> = new Map([
  ["leg press", "leg_press"],
  ["leg curl", "leg_curl"],
  ["lying leg curl", "machine_leg_curl_lying"],
  ["seated leg curl", "machine_leg_curl_seated"],
  ["leg extension", "leg_extension"],
  ["lat pulldown", "lat_pulldown"],
  ["tricep pushdown", "tricep_pushdown"],
  ["triceps pushdown", "tricep_pushdown"],
  ["chest press", "machine_chest_press"],
  ["selector chest press", "machine_chest_press"],
  ["incline chest press", "machine_incline_chest_press"],
  ["decline chest press", "machine_decline_chest_press"],
  ["vertical chest press", "machine_chest_press_vertical"],
  ["horizontal chest press", "machine_chest_press"],
  ["low row", "machine_row"],
  ["mid row", "machine_row"],
  ["high row", "machine_row"],
  ["seated row", "seated_cable_row"],
  ["cable row", "seated_cable_row"],
  // Legacy export: "Arsenal Strength Fly Machine" → aggressive normalize drops brands/machine → "strength fly".
  ["strength fly", "machine_chest_fly"],
  ["single leg unilateral leg press", "leg_press"],
]);

function resolveBicepCurlFamily(k: string): string | null {
  if (!/\bbicep curl\b/.test(k) && !/\bbiceps curl\b/.test(k)) return null;
  if (/\bcable\b/.test(k)) return "cable_bicep_curl";
  if (/\b(machine|selector|stack)\b/.test(k)) return "machine_bicep_curl";
  if (/\bband\b/.test(k)) return "band_bicep_curl";
  if (/\b(dumbbell|dumbbells|\bdb\b)\b/.test(k)) return "dumbbell_curl";
  if (/\bbarbell\b/.test(k)) return "bicep_curl";
  return "bicep_curl";
}

function resolveChestPressFamily(k: string): string | null {
  if (!/\bchest press\b/.test(k)) return null;
  if (/\bsmith\b/.test(k) && /\bincline\b/.test(k)) return "smith_machine_incline_bench";
  if (/\bhorizontal\b/.test(k)) return "machine_chest_press";
  if (/\bincline\b/.test(k)) return "machine_incline_chest_press";
  if (/\bdecline\b/.test(k)) return "machine_decline_chest_press";
  if (/\bvertical\b/.test(k)) return "machine_chest_press_vertical";
  if (/\bcable\b/.test(k)) return "cable_chest_press";
  if (/\bband\b/.test(k)) return "band_chest_press";
  if (/\bsmith\b/.test(k)) {
    if (/\bbench\b/.test(k)) return "smith_machine_bench_press";
    return "machine_chest_press";
  }
  return null;
}

function resolveRowFamily(k: string): string | null {
  // Must contain "row" as a word; avoid "barbell row" etc. (already catalogued).
  if (!/\brow\b/.test(k)) return null;
  if (/\b(bent|pendlay|yates|upright|inverted|landmine|t\s*bar|tbar)\b/.test(k)) return null;
  if (/\b(lat pulldown|pulldown)\b/.test(k)) return null;

  if (/\bone\s+arm\b|\bsingle\s+arm\b|\bunilateral\b/.test(k) && /\bcable\b/.test(k)) return "cable_one_arm_row";
  if (/\bcable\b/.test(k) && /\bseated\b/.test(k)) return "seated_cable_row";
  if (/\bcable\b/.test(k)) return "cable_row_straight_bar";
  if (/\b(dumbbell|dumbbells|\bdb\b)\b/.test(k)) return "single_arm_dumbbell_row";
  if (/\bbarbell\b/.test(k)) return "barbell_row";
  if (/\b(low|mid)\s+row\b/.test(k)) return "machine_row";
  return null;
}

function resolveTricepPushdownFamily(k: string): string | null {
  if (!/\btricep(s)?\s+pushdown\b/.test(k) && !/\btriceps\s+pushdown\b/.test(k)) return null;
  if (/\brope\b/.test(k)) return "cable_tricep_pushdown_rope";
  if (/\bband\b/.test(k)) return "band_tricep_pushdown";
  return "tricep_pushdown";
}
