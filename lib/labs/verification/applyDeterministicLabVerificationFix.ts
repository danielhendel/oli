/**
 * Deterministic system verification fixes for resolvable Quest layout defects.
 * Never invents analyte identity or numeric values — only unit/profile realignment.
 */
import type { LabResultCandidate } from "@oli/contracts";
import { LABS_UNIT_REGISTRY_VERSION } from "@oli/contracts";
import { getLabMetricImportProfile } from "../autoPublish/labMetricImportProfiles";
import { getLabMetricByKey } from "../labMetricCatalog";

export type LabVerificationFix = {
  candidate: LabResultCandidate;
  methods: string[];
};

function preferredAllowedUnit(metricId: string): string | null {
  const profile = getLabMetricImportProfile(metricId);
  if (!profile) return null;
  const preferred = getLabMetricByKey(metricId)?.preferredUnit;
  if (preferred && profile.allowedUnits.includes(preferred)) return preferred;
  if (profile.allowedUnits.length === 1) return profile.allowedUnits[0]!;
  return null;
}

/**
 * Apply provider-scoped deterministic unit realignment rules.
 * Returns null when no safe fix applies.
 */
export function applyDeterministicLabVerificationFix(
  candidate: LabResultCandidate,
): LabVerificationFix | null {
  const metricId = candidate.aliasMatch.canonicalMetricId;
  if (!metricId) return null;
  const methods: string[] = [];
  let next: LabResultCandidate = candidate;

  // Quest HbA1c: unit column sometimes captures adjacent "Hgb" token; expected unit is %.
  if (
    metricId === "hba1c" &&
    (!candidate.unit.normalizedUnit ||
      !candidate.unit.known ||
      /^hgb$/i.test(candidate.unit.rawUnit ?? ""))
  ) {
    const range = candidate.rawReferenceRange ?? "";
    const looksLikePercentContext =
      /%/.test(range) || /of\s*total/i.test(range) || /^hgb$/i.test(candidate.unit.rawUnit ?? "");
    if (looksLikePercentContext) {
      next = {
        ...next,
        unit: {
          rawUnit: candidate.unit.rawUnit,
          normalizedUnit: "%",
          unitRegistryVersion: LABS_UNIT_REGISTRY_VERSION,
          confidence: 0.99,
          known: true,
        },
        warnings: next.warnings.filter(
          (w) => w !== "ambiguous_unit" && w !== "low_confidence",
        ),
        confidence: Math.max(next.confidence, 0.95),
      };
      methods.push("quest_hba1c_unit_realign_v1");
    }
  }

  // Lipid panel metrics with missing unit: use catalog preferred unit when uniquely allowed.
  if (
    (metricId === "ldl_c" ||
      metricId === "hdl_c" ||
      metricId === "total_cholesterol" ||
      metricId === "triglycerides") &&
    !next.unit.normalizedUnit
  ) {
    const unit = preferredAllowedUnit(metricId);
    if (unit) {
      next = {
        ...next,
        unit: {
          rawUnit: next.unit.rawUnit,
          normalizedUnit: unit,
          unitRegistryVersion: LABS_UNIT_REGISTRY_VERSION,
          confidence: 0.99,
          known: true,
        },
        warnings: next.warnings.filter((w) => w !== "ambiguous_unit" && w !== "low_confidence"),
        confidence: Math.max(next.confidence, 0.95),
      };
      methods.push("quest_lipid_default_unit_v1");
    }
  }

  // Truncated nmol/ → recover nmol/min/mL for Lp-PLA2 when raw suggests activity assay.
  if (metricId === "lp_pla2") {
    const raw = (next.unit.rawUnit ?? "").trim();
    if (/^nmol\/?$/i.test(raw) || /^nmol\/min\/ml$/i.test(raw) || !next.unit.normalizedUnit) {
      const activity = /^nmol\/?$/i.test(raw) || /^nmol\/min\/ml$/i.test(raw) || !next.unit.normalizedUnit;
      if (activity) {
        next = {
          ...next,
          unit: {
            rawUnit: raw || "nmol/min/mL",
            normalizedUnit: "nmol/min/mL",
            unitRegistryVersion: LABS_UNIT_REGISTRY_VERSION,
            confidence: 0.99,
            known: true,
          },
          warnings: next.warnings.filter((w) => w !== "ambiguous_unit" && w !== "low_confidence"),
          confidence: Math.max(next.confidence, 0.95),
        };
        methods.push("quest_lp_pla2_activity_unit_v1");
      }
    }
  }

  // Dimensionless / qualitative profiles: Quest often puts Pattern/calc tokens in the unit column.
  // When the import profile allows "none" and the result is non-numeric, assign preferred unit.
  {
    const profile = getLabMetricImportProfile(metricId);
    const kind = next.result?.kind;
    const nonNumeric =
      kind === "pattern" ||
      kind === "text" ||
      kind === "qualitative" ||
      kind === "not_reported";
    const rawUnit = (next.unit.rawUnit ?? "").trim();
    const unitLooksDimensionless =
      !rawUnit ||
      /^(pattern|calc|calculated|none|n\/a)$/i.test(rawUnit) ||
      next.unit.normalizedUnit === "none";
    if (
      profile &&
      nonNumeric &&
      profile.allowedUnits.includes("none") &&
      profile.expectedKinds.includes(kind!) &&
      unitLooksDimensionless &&
      (next.warnings.includes("ambiguous_unit") ||
        next.warnings.includes("low_confidence") ||
        !next.unit.known ||
        next.unit.normalizedUnit !== "none")
    ) {
      next = {
        ...next,
        unit: {
          rawUnit: next.unit.rawUnit,
          normalizedUnit: "none",
          unitRegistryVersion: LABS_UNIT_REGISTRY_VERSION,
          confidence: 0.99,
          known: true,
        },
        warnings: next.warnings.filter((w) => w !== "ambiguous_unit" && w !== "low_confidence"),
        confidence: Math.max(next.confidence, 0.95),
      };
      methods.push("quest_dimensionless_unit_v1");
    }
  }

  if (methods.length === 0) return null;
  return { candidate: next, methods };
}
