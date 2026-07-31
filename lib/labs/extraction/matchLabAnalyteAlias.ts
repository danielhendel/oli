/**
 * Versioned analyte alias registry (Phase 3D-A).
 * Deterministic exact / normalized matching only. No broad fuzzy match.
 */

import {
  LABS_ALIAS_REGISTRY_VERSION,
  type LabAliasMatch,
} from "@oli/contracts";
import { getAllLabMetrics, getLabMetricByKey, type LabMetricDefinition } from "../labMetricCatalog";

export type AliasMatchOutcome = LabAliasMatch & {
  metric?: LabMetricDefinition;
};

function normalizeLabel(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[_/]+/g, " ")
    .replace(/[()[\],.:;]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Strip Quest method/assay suffixes for alias lookup (label remains original elsewhere). */
function labelLookupKeys(raw: string): string[] {
  const base = normalizeLabel(raw);
  if (!base) return [];
  const keys = [base];
  const withoutMethod = base
    .replace(/\b(?:ms|ia|lc ms|lc\/ms|immunoassay|calculated|calc)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (withoutMethod && withoutMethod !== base) keys.push(withoutMethod);
  // Drop trailing assay tokens one at a time for "TESTOSTERONE TOTAL MS" style labels.
  const parts = withoutMethod.split(" ");
  for (let i = parts.length - 1; i >= 2; i--) {
    keys.push(parts.slice(0, i).join(" "));
  }
  return [...new Set(keys.filter(Boolean))];
}

/** Extra Quest/DirectLabs label forms not already on catalog aliases. */
const EXTRA_ALIASES: readonly { metricKey: string; aliases: readonly string[] }[] = [
  { metricKey: "ldl_c", aliases: ["ldl-cholesterol", "ldl cholesterol", "cholesterol ldl"] },
  { metricKey: "hdl_c", aliases: ["hdl-cholesterol", "hdl cholesterol", "cholesterol hdl"] },
  { metricKey: "hba1c", aliases: ["hemoglobin a1c", "hemoglobin a1c %", "hb a1c", "a1c"] },
  { metricKey: "apob", aliases: ["apolipoprotein b", "apo-b", "apo b"] },
  { metricKey: "lpa", aliases: ["lipoprotein (a)", "lipoprotein(a)", "lp(a)"] },
  { metricKey: "total_cholesterol", aliases: ["cholesterol, total", "cholesterol total"] },
  { metricKey: "triglycerides", aliases: ["triglyceride"] },
  { metricKey: "wbc", aliases: ["white blood cell count", "wbc count"] },
  { metricKey: "hemoglobin", aliases: ["hemoglobin", "hgb"] },
  { metricKey: "tsh", aliases: ["tsh", "thyroid stimulating hormone"] },
  { metricKey: "vitamin_d", aliases: ["vitamin d, 25-hydroxy", "25-hydroxyvitamin d", "vitamin d 25-oh", "vitamin d 25 oh total", "vitamin d 25-oh total"] },
  { metricKey: "psa", aliases: ["prostate specific antigen", "psa, total"] },
  { metricKey: "ldl_particle_number", aliases: ["ldl-p", "ldl particle number"] },
  { metricKey: "small_ldl_p", aliases: ["small ldl-p", "small dense ldl-p", "ldl small", "small ldl"] },
  { metricKey: "co2_bicarbonate", aliases: ["carbon dioxide", "co2 content"] },
  { metricKey: "phosphorus", aliases: ["phosphate (as phosphorus)", "phosphate as phosphorus"] },
  { metricKey: "folate", aliases: ["folate, serum", "folate serum"] },
  { metricKey: "cortisol", aliases: ["cortisol, total", "cortisol total"] },
  { metricKey: "total_testosterone", aliases: ["testosterone total ms", "testosterone, total, ms", "testosterone total"] },
];

type IndexEntry = { metricKey: string; method: LabAliasMatch["matchMethod"] };

function buildIndex(): Map<string, IndexEntry[]> {
  const map = new Map<string, IndexEntry[]>();
  const push = (key: string, entry: IndexEntry) => {
    const list = map.get(key) ?? [];
    list.push(entry);
    map.set(key, list);
  };

  for (const metric of getAllLabMetrics()) {
    push(normalizeLabel(metric.metricKey.replace(/_/g, " ")), {
      metricKey: metric.metricKey,
      method: "exact_canonical",
    });
    push(normalizeLabel(metric.displayName), {
      metricKey: metric.metricKey,
      method: "exact_canonical",
    });
    for (const alias of metric.aliases) {
      push(normalizeLabel(alias), { metricKey: metric.metricKey, method: "exact_alias" });
    }
  }

  for (const extra of EXTRA_ALIASES) {
    if (!getLabMetricByKey(extra.metricKey)) continue;
    for (const alias of extra.aliases) {
      push(normalizeLabel(alias), { metricKey: extra.metricKey, method: "normalized_exact" });
    }
  }

  return map;
}

const ALIAS_INDEX = buildIndex();

/**
 * Map a report analyte label to a catalog metric.
 * Ambiguous multi-metric hits remain unmatched and require review.
 */
export function matchLabAnalyteAlias(rawLabel: string): AliasMatchOutcome {
  const lookupKeys = labelLookupKeys(rawLabel);
  if (lookupKeys.length === 0) {
    return {
      canonicalMetricId: null,
      matchMethod: "unmatched",
      aliasVersion: LABS_ALIAS_REGISTRY_VERSION,
      confidence: 0,
      requiresReview: true,
    };
  }

  let hits: IndexEntry[] = [];
  for (const key of lookupKeys) {
    const found = ALIAS_INDEX.get(key) ?? [];
    if (found.length > 0) {
      hits = found;
      break;
    }
  }
  const uniqueKeys = [...new Set(hits.map((h) => h.metricKey))];

  if (uniqueKeys.length === 0) {
    return {
      canonicalMetricId: null,
      matchMethod: "unmatched",
      aliasVersion: LABS_ALIAS_REGISTRY_VERSION,
      confidence: 0.2,
      requiresReview: true,
    };
  }

  if (uniqueKeys.length > 1) {
    return {
      canonicalMetricId: null,
      matchMethod: "unmatched",
      aliasVersion: LABS_ALIAS_REGISTRY_VERSION,
      confidence: 0.35,
      requiresReview: true,
    };
  }

  const best = hits[0]!;
  const metric = getLabMetricByKey(best.metricKey);
  const confidence =
    best.method === "exact_canonical" ? 0.99 : best.method === "exact_alias" ? 0.95 : 0.9;

  return {
    canonicalMetricId: best.metricKey,
    matchMethod: best.method,
    aliasVersion: LABS_ALIAS_REGISTRY_VERSION,
    confidence,
    requiresReview: confidence < 0.95,
    ...(metric ? { metric } : {}),
  };
}
