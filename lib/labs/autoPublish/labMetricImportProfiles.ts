/**
 * Versioned metric import profiles for high-confidence auto-publish (Phase 3D-A).
 * Only metrics with deterministic fixtures and autoPublishV1=true may auto-publish.
 */
import type { LabMetricImportProfile } from "@oli/contracts";
import { getAllLabMetrics, getLabMetricByKey } from "../labMetricCatalog";

function profile(
  metricId: string,
  overrides: Partial<Omit<LabMetricImportProfile, "metricId" | "allowedUnits" | "expectedKinds">> & {
    expectedKinds?: LabMetricImportProfile["expectedKinds"];
    allowedUnits?: readonly string[];
    autoPublishV1?: boolean;
    supportsComparatorDisplay?: boolean;
    supportsComparatorProjection?: boolean;
    supportsComparatorTrend?: boolean;
  } = {},
): LabMetricImportProfile {
  const metric = getLabMetricByKey(metricId);
  if (!metric) {
    throw new Error(`IMPORT_PROFILE_UNKNOWN_METRIC:${metricId}`);
  }
  return {
    metricId,
    expectedKinds: overrides.expectedKinds ?? ["numeric"],
    allowedUnits: [...(overrides.allowedUnits ?? metric.commonUnits)],
    ...(overrides.compatiblePanels ? { compatiblePanels: [...overrides.compatiblePanels] } : {}),
    methodSensitive: overrides.methodSensitive ?? false,
    specimenSensitive: overrides.specimenSensitive ?? false,
    autoPublishV1: overrides.autoPublishV1 ?? metric.resultType === "numeric",
    supportsComparatorDisplay: overrides.supportsComparatorDisplay ?? true,
    supportsComparatorProjection: overrides.supportsComparatorProjection ?? true,
    supportsComparatorTrend: overrides.supportsComparatorTrend ?? false,
  };
}

/** High-value standard panels — autoPublishV1 true only for numeric equality metrics. */
const PROFILES: LabMetricImportProfile[] = [
  // Lipid / Cardio IQ numerics
  profile("total_cholesterol", { compatiblePanels: ["LIPID PANEL", "CARDIO IQ"], autoPublishV1: true }),
  profile("ldl_c", { compatiblePanels: ["LIPID PANEL", "CARDIO IQ"], autoPublishV1: true }),
  profile("hdl_c", { compatiblePanels: ["LIPID PANEL", "CARDIO IQ"], autoPublishV1: true }),
  profile("triglycerides", { compatiblePanels: ["LIPID PANEL", "CARDIO IQ"], autoPublishV1: true }),
  profile("apob", { compatiblePanels: ["LIPID PANEL", "CARDIO IQ"], autoPublishV1: true }),
  profile("lpa", { compatiblePanels: ["LIPID PANEL", "CARDIO IQ"], methodSensitive: true, autoPublishV1: true }),
  profile("hs_crp", { autoPublishV1: true }),
  profile("ldl_particle_number", { compatiblePanels: ["CARDIO IQ"], autoPublishV1: true }),
  profile("small_ldl_p", { compatiblePanels: ["CARDIO IQ"], autoPublishV1: true }),
  profile("lp_pla2", {
    compatiblePanels: ["CARDIO IQ"],
    allowedUnits: ["nmol/min/mL", "ng/mL"],
    autoPublishV1: true,
  }),
  profile("non_hdl_c", { compatiblePanels: ["LIPID PANEL", "CARDIO IQ"], autoPublishV1: true }),
  profile("chol_hdl_ratio", {
    compatiblePanels: ["LIPID PANEL", "CARDIO IQ"],
    allowedUnits: ["ratio", "calc"],
    autoPublishV1: true,
  }),
  profile("ldl_medium", { compatiblePanels: ["CARDIO IQ"], autoPublishV1: true }),
  profile("hdl_large", { compatiblePanels: ["CARDIO IQ"], autoPublishV1: true }),
  profile("ldl_peak_size", {
    compatiblePanels: ["CARDIO IQ"],
    allowedUnits: ["Angstrom", "nm"],
    autoPublishV1: true,
  }),
  profile("ldl_pattern", {
    compatiblePanels: ["CARDIO IQ"],
    expectedKinds: ["pattern", "text", "not_reported", "qualitative"],
    allowedUnits: ["none"],
    autoPublishV1: true,
  }),

  // Metabolic / CMP
  profile("glucose", { compatiblePanels: ["COMPREHENSIVE METABOLIC PANEL", "CMP", "BMP"], autoPublishV1: true }),
  profile("hba1c", { autoPublishV1: true }),
  profile("eag", { allowedUnits: ["mg/dL", "mmol/L"], autoPublishV1: true }),
  profile("fasting_insulin", { autoPublishV1: true }),
  profile("c_peptide", { autoPublishV1: true }),

  // Liver
  profile("alt", { compatiblePanels: ["COMPREHENSIVE METABOLIC PANEL", "CMP", "HEPATIC"], autoPublishV1: true }),
  profile("ast", { compatiblePanels: ["COMPREHENSIVE METABOLIC PANEL", "CMP", "HEPATIC"], autoPublishV1: true }),
  profile("alp", { autoPublishV1: true }),
  profile("ggt", { autoPublishV1: true }),
  profile("total_bilirubin", { autoPublishV1: true }),
  profile("albumin", { autoPublishV1: true }),
  profile("total_protein", { autoPublishV1: true }),
  profile("serum_globulin", {
    compatiblePanels: ["COMPREHENSIVE METABOLIC PANEL", "CMP"],
    allowedUnits: ["g/dL", "g/L"],
    autoPublishV1: true,
  }),
  profile("albumin_globulin_ratio", { allowedUnits: ["ratio"], autoPublishV1: true }),
  profile("ldh", { allowedUnits: ["U/L", "IU/L"], autoPublishV1: true }),

  // Kidney / CMP
  profile("creatinine", { compatiblePanels: ["COMPREHENSIVE METABOLIC PANEL", "CMP", "BMP"], autoPublishV1: true }),
  profile("egfr", { compatiblePanels: ["COMPREHENSIVE METABOLIC PANEL", "CMP"], autoPublishV1: true }),
  profile("bun", { autoPublishV1: true }),
  profile("cystatin_c", { autoPublishV1: true }),
  profile("uric_acid", { autoPublishV1: true }),
  profile("osmolality_serum", { allowedUnits: ["mOsm/kg", "mOsm/L"], autoPublishV1: true }),

  // CBC
  profile("wbc", {
    allowedUnits: ["10^3/uL", "Thousand/uL", "K/uL"],
    compatiblePanels: ["CBC", "COMPLETE BLOOD COUNT"],
    autoPublishV1: true,
  }),
  profile("rbc", {
    allowedUnits: ["10^6/uL", "Million/uL", "M/uL"],
    compatiblePanels: ["CBC", "COMPLETE BLOOD COUNT"],
    autoPublishV1: true,
  }),
  profile("hemoglobin", { compatiblePanels: ["CBC", "COMPLETE BLOOD COUNT"], autoPublishV1: true }),
  profile("hematocrit", { compatiblePanels: ["CBC", "COMPLETE BLOOD COUNT"], autoPublishV1: true }),
  profile("mcv", { allowedUnits: ["fL"], autoPublishV1: true }),
  profile("mch", { allowedUnits: ["pg"], autoPublishV1: true }),
  profile("mchc", { allowedUnits: ["g/dL"], autoPublishV1: true }),
  profile("rdw", { allowedUnits: ["%"], autoPublishV1: true }),
  profile("platelets", {
    allowedUnits: ["10^3/uL", "Thousand/uL", "K/uL"],
    compatiblePanels: ["CBC", "COMPLETE BLOOD COUNT"],
    autoPublishV1: true,
  }),
  profile("mpv", { allowedUnits: ["fL"], autoPublishV1: true }),
  profile("neutrophils_pct", { allowedUnits: ["%"], autoPublishV1: true }),
  profile("lymphocytes_pct", { allowedUnits: ["%"], autoPublishV1: true }),
  profile("monocytes_pct", { allowedUnits: ["%"], autoPublishV1: true }),
  profile("eosinophils_pct", { allowedUnits: ["%"], autoPublishV1: true }),
  profile("basophils_pct", { allowedUnits: ["%"], autoPublishV1: true }),
  profile("absolute_neutrophils", { allowedUnits: ["10^3/uL", "Thousand/uL", "K/uL", "cells/uL"], autoPublishV1: true }),
  profile("absolute_lymphocytes", { allowedUnits: ["10^3/uL", "Thousand/uL", "K/uL", "cells/uL"], autoPublishV1: true }),
  profile("absolute_monocytes", { allowedUnits: ["10^3/uL", "Thousand/uL", "K/uL", "cells/uL"], autoPublishV1: true }),
  profile("absolute_eosinophils", { allowedUnits: ["10^3/uL", "Thousand/uL", "K/uL", "cells/uL"], autoPublishV1: true }),
  profile("absolute_basophils", { allowedUnits: ["10^3/uL", "Thousand/uL", "K/uL", "cells/uL"], autoPublishV1: true }),
  profile("ferritin", { autoPublishV1: true }),
  profile("iron", { autoPublishV1: true }),
  profile("tibc", { autoPublishV1: true }),
  profile("transferrin", { allowedUnits: ["mg/dL", "g/L"], autoPublishV1: true }),
  profile("immunoglobulin_a", { allowedUnits: ["mg/dL", "g/L"], autoPublishV1: true }),

  // Thyroid / hormones
  profile("tsh", { compatiblePanels: ["THYROID"], autoPublishV1: true }),
  profile("free_t4", { compatiblePanels: ["THYROID"], autoPublishV1: true }),
  profile("free_t3", { compatiblePanels: ["THYROID"], autoPublishV1: true }),
  profile("total_testosterone", { methodSensitive: true, autoPublishV1: true }),
  profile("free_testosterone", { methodSensitive: true, autoPublishV1: true }),
  profile("bioavailable_testosterone", { methodSensitive: true, autoPublishV1: true }),
  profile("shbg", { autoPublishV1: true }),
  profile("estradiol", { methodSensitive: true, autoPublishV1: true }),
  profile("dhea_s", { autoPublishV1: true }),
  profile("cortisol", { autoPublishV1: true }),
  profile("lh", { autoPublishV1: true }),
  profile("fsh", { autoPublishV1: true }),
  profile("prolactin", { autoPublishV1: true }),

  // Nutritional / electrolytes / inflammation
  profile("vitamin_d", { autoPublishV1: true }),
  profile("vitamin_b12", { autoPublishV1: true }),
  profile("folate", { autoPublishV1: true }),
  profile("mercury_blood", { allowedUnits: ["ug/L", "nmol/L"], autoPublishV1: true }),
  profile("sodium", { compatiblePanels: ["COMPREHENSIVE METABOLIC PANEL", "CMP", "BMP"], autoPublishV1: true }),
  profile("potassium", { compatiblePanels: ["COMPREHENSIVE METABOLIC PANEL", "CMP", "BMP"], autoPublishV1: true }),
  profile("chloride", { autoPublishV1: true }),
  profile("co2_bicarbonate", { autoPublishV1: true }),
  profile("calcium", { autoPublishV1: true }),
  profile("magnesium_serum", { autoPublishV1: true }),
  profile("phosphorus", { autoPublishV1: true }),
  profile("psa", { autoPublishV1: true }),
  profile("interleukin_6", { allowedUnits: ["pg/mL", "ng/L"], autoPublishV1: true }),
  profile("creatine_kinase", { allowedUnits: ["U/L", "IU/L"], autoPublishV1: true }),

  // Ratio metrics stay structured-only in v1 (not numeric card auto-publish)
  profile("homa_ir", { expectedKinds: ["numeric"], autoPublishV1: false }),
  profile("bun_creatinine_ratio", { expectedKinds: ["numeric"], autoPublishV1: false }),
  profile("transferrin_saturation", { expectedKinds: ["numeric"], autoPublishV1: false }),
];

const BY_ID = new Map(PROFILES.map((p) => [p.metricId, p]));

export function getLabMetricImportProfile(metricId: string): LabMetricImportProfile | undefined {
  return BY_ID.get(metricId);
}

export function listLabMetricImportProfiles(): readonly LabMetricImportProfile[] {
  return PROFILES;
}

/** Assert every profile metric exists in the catalog (dev/test invariant). */
export function assertImportProfilesCatalogAligned(): void {
  const known = new Set(getAllLabMetrics().map((m) => m.metricKey));
  for (const p of PROFILES) {
    if (!known.has(p.metricId)) {
      throw new Error(`IMPORT_PROFILE_MISSING_CATALOG:${p.metricId}`);
    }
  }
}
