// lib/labs/labMetricCatalog.ts
// Canonical lab biomarker taxonomy — pure helpers, no I/O.

export type LabResultType = "numeric" | "ratio" | "text";

export type LabMetricFlag = "low" | "normal" | "high" | "critical" | "unknown";

export type LabMetricDefinition = {
  metricKey: string;
  categoryKey: string;
  displayName: string;
  aliases: string[];
  commonUnits: string[];
  preferredUnit: string;
  sortOrder: number;
  resultType: LabResultType;
};

export type LabCategoryDefinition = {
  categoryKey: string;
  displayName: string;
  sortOrder: number;
  /** Metric keys shown in this category card (may reference shared catalog entries). */
  metricKeys: string[];
};

export type LabMetricResultLike = {
  metricKey: string;
  categoryKey?: string;
  displayName?: string;
  value?: number | null;
  unit?: string | null;
  referenceRangeLow?: number | null;
  referenceRangeHigh?: number | null;
  referenceRangeText?: string | null;
  flag?: LabMetricFlag | null;
  collectedAt?: string | null;
  reportedAt?: string | null;
  uploadId?: string | null;
  rawValueText?: string | null;
};

export type LabResultsByCategory = {
  category: LabCategoryDefinition;
  metrics: {
    definition: LabMetricDefinition;
    latest: LabMetricResultLike | null;
  }[];
};

const M = (
  metricKey: string,
  categoryKey: string,
  displayName: string,
  aliases: string[],
  commonUnits: string[],
  preferredUnit: string,
  sortOrder: number,
  resultType: LabResultType = "numeric",
): LabMetricDefinition => ({
  metricKey,
  categoryKey,
  displayName,
  aliases,
  commonUnits,
  preferredUnit,
  sortOrder,
  resultType,
});

const LAB_METRICS: LabMetricDefinition[] = [
  // Cardiovascular Health
  M("total_cholesterol", "cardiovascular", "Total Cholesterol", ["cholesterol, total", "total chol", "tc"], ["mg/dL", "mmol/L"], "mg/dL", 10),
  M("ldl_c", "cardiovascular", "LDL-C", ["ldl cholesterol", "ldl-c", "ldl"], ["mg/dL", "mmol/L"], "mg/dL", 20),
  M("hdl_c", "cardiovascular", "HDL-C", ["hdl cholesterol", "hdl-c", "hdl"], ["mg/dL", "mmol/L"], "mg/dL", 30),
  M("triglycerides", "cardiovascular", "Triglycerides", ["triglyceride", "tg", "trigs"], ["mg/dL", "mmol/L"], "mg/dL", 40),
  M("apob", "cardiovascular", "ApoB", ["apolipoprotein b", "apo b"], ["mg/dL", "g/L"], "mg/dL", 50),
  M("lpa", "cardiovascular", "Lp(a)", ["lipoprotein(a)", "lp(a)", "lp a"], ["mg/dL", "nmol/L"], "mg/dL", 60),
  M("hs_crp", "cardiovascular", "hs-CRP", ["hs crp", "hscrp", "c-reactive protein, high sensitivity", "crp, high sensitivity"], ["mg/L"], "mg/L", 70),
  M("ldl_particle_number", "cardiovascular", "LDL Particle Number", ["ldl-p", "ldl particle count", "ldl-p number"], ["nmol/L"], "nmol/L", 80),
  M("small_ldl_p", "cardiovascular", "Small LDL-P", ["small dense ldl", "sdldl-p"], ["nmol/L"], "nmol/L", 90),
  M("lp_pla2", "cardiovascular", "Lp-PLA2", ["lipoprotein-associated phospholipase a2", "pla2"], ["ng/mL"], "ng/mL", 100),

  // Metabolic Health
  M("glucose", "metabolic", "Glucose", ["fasting glucose", "blood glucose", "glu"], ["mg/dL", "mmol/L"], "mg/dL", 10),
  M("hba1c", "metabolic", "HbA1c", ["a1c", "hemoglobin a1c", "hba1c"], ["%", "mmol/mol"], "%", 20),
  M("fasting_insulin", "metabolic", "Fasting Insulin", ["insulin, fasting", "insulin"], ["uIU/mL", "mIU/L"], "uIU/mL", 30),
  M("homa_ir", "metabolic", "HOMA-IR", ["homa ir", "homa"], ["index"], "index", 40, "ratio"),
  M("c_peptide", "metabolic", "C-Peptide", ["c peptide", "c-pep"], ["ng/mL", "nmol/L"], "ng/mL", 50),

  // Liver Health
  M("alt", "liver", "ALT", ["alanine aminotransferase", "sgpt"], ["U/L", "IU/L"], "U/L", 10),
  M("ast", "liver", "AST", ["aspartate aminotransferase", "sgot"], ["U/L", "IU/L"], "U/L", 20),
  M("alp", "liver", "ALP", ["alkaline phosphatase"], ["U/L", "IU/L"], "U/L", 30),
  M("ggt", "liver", "GGT", ["gamma-glutamyl transferase", "ggtp"], ["U/L", "IU/L"], "U/L", 40),
  M("total_bilirubin", "liver", "Total Bilirubin", ["bilirubin, total", "tbili"], ["mg/dL", "umol/L"], "mg/dL", 50),
  M("albumin", "liver", "Albumin", ["alb"], ["g/dL", "g/L"], "g/dL", 60),
  M("total_protein", "liver", "Total Protein", ["protein, total"], ["g/dL", "g/L"], "g/dL", 70),

  // Kidney Health
  M("creatinine", "kidney", "Creatinine", ["creat", "scr"], ["mg/dL", "umol/L"], "mg/dL", 10),
  M("egfr", "kidney", "eGFR", ["estimated gfr", "gfr"], ["mL/min/1.73m2", "mL/min"], "mL/min/1.73m2", 20),
  M("bun", "kidney", "BUN", ["blood urea nitrogen", "urea nitrogen"], ["mg/dL", "mmol/L"], "mg/dL", 30),
  M("bun_creatinine_ratio", "kidney", "BUN/Creatinine Ratio", ["bun/creat", "bun:creat"], ["ratio"], "ratio", 40, "ratio"),
  M("cystatin_c", "kidney", "Cystatin C", ["cystatin-c"], ["mg/L", "mg/dL"], "mg/L", 50),
  M("urine_albumin_creatinine_ratio", "kidney", "Urine Albumin/Creatinine Ratio", ["uacr", "albumin/creatinine ratio", "microalbumin/creatinine"], ["mg/g", "mg/mmol"], "mg/g", 60, "ratio"),

  // Blood & Iron
  M("wbc", "blood_iron", "WBC", ["white blood cell count", "leukocytes"], ["10^3/uL", "K/uL"], "10^3/uL", 10),
  M("rbc", "blood_iron", "RBC", ["red blood cell count", "erythrocytes"], ["10^6/uL", "M/uL"], "10^6/uL", 20),
  M("hemoglobin", "blood_iron", "Hemoglobin", ["hgb", "hb"], ["g/dL", "g/L"], "g/dL", 30),
  M("hematocrit", "blood_iron", "Hematocrit", ["hct"], ["%", "L/L"], "%", 40),
  M("platelets", "blood_iron", "Platelets", ["plt", "platelet count"], ["10^3/uL", "K/uL"], "10^3/uL", 50),
  M("ferritin", "blood_iron", "Ferritin", ["fer"], ["ng/mL", "ug/L"], "ng/mL", 60),
  M("iron", "blood_iron", "Iron", ["serum iron", "fe"], ["ug/dL", "umol/L"], "ug/dL", 70),
  M("tibc", "blood_iron", "TIBC", ["total iron binding capacity"], ["ug/dL", "umol/L"], "ug/dL", 80),
  M("transferrin_saturation", "blood_iron", "Transferrin Saturation", ["tsat", "iron saturation"], ["%"], "%", 90, "ratio"),

  // Hormones + Thyroid
  M("tsh", "hormones_thyroid", "TSH", ["thyroid stimulating hormone"], ["mIU/L", "uIU/mL"], "mIU/L", 10),
  M("free_t4", "hormones_thyroid", "Free T4", ["ft4", "free thyroxine"], ["ng/dL", "pmol/L"], "ng/dL", 20),
  M("free_t3", "hormones_thyroid", "Free T3", ["ft3", "free triiodothyronine"], ["pg/mL", "pmol/L"], "pg/mL", 30),
  M("total_testosterone", "hormones_thyroid", "Total Testosterone", ["testosterone, total", "testosterone"], ["ng/dL", "nmol/L"], "ng/dL", 40),
  M("free_testosterone", "hormones_thyroid", "Free Testosterone", ["testosterone, free"], ["pg/mL", "ng/dL"], "pg/mL", 50),
  M("shbg", "hormones_thyroid", "SHBG", ["sex hormone binding globulin"], ["nmol/L", "ug/mL"], "nmol/L", 60),
  M("estradiol", "hormones_thyroid", "Estradiol", ["e2", "estrogen"], ["pg/mL", "pmol/L"], "pg/mL", 70),
  M("dhea_s", "hormones_thyroid", "DHEA-S", ["dhea sulfate", "dheas"], ["ug/dL", "umol/L"], "ug/dL", 80),
  M("lh", "hormones_thyroid", "LH", ["luteinizing hormone"], ["mIU/mL", "IU/L"], "mIU/mL", 90),
  M("fsh", "hormones_thyroid", "FSH", ["follicle stimulating hormone"], ["mIU/mL", "IU/L"], "mIU/mL", 100),
  M("prolactin", "hormones_thyroid", "Prolactin", ["prl"], ["ng/mL", "ug/L"], "ng/mL", 110),
  M("cortisol", "hormones_thyroid", "Cortisol", ["cortisol, serum", "cortisol am"], ["ug/dL", "nmol/L"], "ug/dL", 120),

  // Nutritional Status
  M("vitamin_d", "nutritional", "Vitamin D", ["25-hydroxyvitamin d", "25-oh vitamin d", "vit d", "25(oh)d"], ["ng/mL", "nmol/L"], "ng/mL", 10),
  M("vitamin_b12", "nutritional", "Vitamin B12", ["b12", "cobalamin"], ["pg/mL", "pmol/L"], "pg/mL", 20),
  M("folate", "nutritional", "Folate", ["folic acid", "serum folate"], ["ng/mL", "nmol/L"], "ng/mL", 30),
  M("magnesium_rbc", "nutritional", "Magnesium", ["magnesium, rbc", "rbc magnesium"], ["mg/dL", "mmol/L"], "mg/dL", 40),
  M("zinc", "nutritional", "Zinc", ["serum zinc", "zn"], ["ug/dL", "umol/L"], "ug/dL", 50),
  M("omega_3_index", "nutritional", "Omega-3 Index", ["omega 3 index", "omega-3"], ["%"], "%", 60),

  // Inflammation + Immune (hs_crp shared with cardiovascular)
  M("crp", "inflammation", "CRP", ["c-reactive protein", "crp, standard"], ["mg/L", "mg/dL"], "mg/L", 20),
  M("esr", "inflammation", "ESR", ["sed rate", "erythrocyte sedimentation rate"], ["mm/hr"], "mm/hr", 30),
  M("homocysteine", "inflammation", "Homocysteine", ["hcy"], ["umol/L", "mg/L"], "umol/L", 40),

  // Electrolytes + Minerals
  M("sodium", "electrolytes", "Sodium", ["na", "serum sodium"], ["mEq/L", "mmol/L"], "mEq/L", 10),
  M("potassium", "electrolytes", "Potassium", ["k", "serum potassium"], ["mEq/L", "mmol/L"], "mEq/L", 20),
  M("chloride", "electrolytes", "Chloride", ["cl", "serum chloride"], ["mEq/L", "mmol/L"], "mEq/L", 30),
  M("co2_bicarbonate", "electrolytes", "CO2 / Bicarbonate", ["co2", "bicarbonate", "hco3"], ["mEq/L", "mmol/L"], "mEq/L", 40),
  M("calcium", "electrolytes", "Calcium", ["ca", "serum calcium"], ["mg/dL", "mmol/L"], "mg/dL", 50),
  M("magnesium_serum", "electrolytes", "Magnesium", ["magnesium, serum", "serum magnesium"], ["mg/dL", "mmol/L"], "mg/dL", 60),
  M("phosphorus", "electrolytes", "Phosphorus", ["phosphate", "phos"], ["mg/dL", "mmol/L"], "mg/dL", 70),

  // Prostate / Male Health
  M("psa", "prostate", "PSA", ["prostate specific antigen", "psa total"], ["ng/mL", "ug/L"], "ng/mL", 10),
  M("free_psa", "prostate", "Free PSA", ["psa, free"], ["ng/mL"], "ng/mL", 20),
];

const LAB_CATEGORIES: LabCategoryDefinition[] = [
  {
    categoryKey: "cardiovascular",
    displayName: "Cardiovascular Health",
    sortOrder: 10,
    metricKeys: [
      "total_cholesterol",
      "ldl_c",
      "hdl_c",
      "triglycerides",
      "apob",
      "lpa",
      "hs_crp",
      "ldl_particle_number",
      "small_ldl_p",
      "lp_pla2",
    ],
  },
  {
    categoryKey: "metabolic",
    displayName: "Metabolic Health",
    sortOrder: 20,
    metricKeys: ["glucose", "hba1c", "fasting_insulin", "homa_ir", "c_peptide"],
  },
  {
    categoryKey: "liver",
    displayName: "Liver Health",
    sortOrder: 30,
    metricKeys: ["alt", "ast", "alp", "ggt", "total_bilirubin", "albumin", "total_protein"],
  },
  {
    categoryKey: "kidney",
    displayName: "Kidney Health",
    sortOrder: 40,
    metricKeys: [
      "creatinine",
      "egfr",
      "bun",
      "bun_creatinine_ratio",
      "cystatin_c",
      "urine_albumin_creatinine_ratio",
    ],
  },
  {
    categoryKey: "blood_iron",
    displayName: "Blood & Iron",
    sortOrder: 50,
    metricKeys: [
      "wbc",
      "rbc",
      "hemoglobin",
      "hematocrit",
      "platelets",
      "ferritin",
      "iron",
      "tibc",
      "transferrin_saturation",
    ],
  },
  {
    categoryKey: "hormones_thyroid",
    displayName: "Hormones + Thyroid",
    sortOrder: 60,
    metricKeys: [
      "tsh",
      "free_t4",
      "free_t3",
      "total_testosterone",
      "free_testosterone",
      "shbg",
      "estradiol",
      "dhea_s",
      "lh",
      "fsh",
      "prolactin",
      "cortisol",
    ],
  },
  {
    categoryKey: "nutritional",
    displayName: "Nutritional Status",
    sortOrder: 70,
    metricKeys: ["vitamin_d", "vitamin_b12", "folate", "magnesium_rbc", "zinc", "omega_3_index"],
  },
  {
    categoryKey: "inflammation",
    displayName: "Inflammation + Immune",
    sortOrder: 80,
    metricKeys: ["hs_crp", "crp", "esr", "homocysteine"],
  },
  {
    categoryKey: "electrolytes",
    displayName: "Electrolytes + Minerals",
    sortOrder: 90,
    metricKeys: [
      "sodium",
      "potassium",
      "chloride",
      "co2_bicarbonate",
      "calcium",
      "magnesium_serum",
      "phosphorus",
    ],
  },
  {
    categoryKey: "prostate",
    displayName: "Prostate / Male Health",
    sortOrder: 100,
    metricKeys: ["psa", "free_psa"],
  },
];

const METRIC_BY_KEY = new Map(LAB_METRICS.map((m) => [m.metricKey, m]));

function normalizeAlias(alias: string): string {
  return alias.trim().toLowerCase().replace(/\s+/g, " ");
}

const ALIAS_INDEX: Map<string, LabMetricDefinition> = (() => {
  const map = new Map<string, LabMetricDefinition>();
  for (const metric of LAB_METRICS) {
    map.set(normalizeAlias(metric.displayName), metric);
    map.set(normalizeAlias(metric.metricKey.replace(/_/g, " ")), metric);
    for (const alias of metric.aliases) {
      map.set(normalizeAlias(alias), metric);
    }
  }
  return map;
})();

/** Stable ordered lab categories for UI cards. */
export function getLabCategories(): LabCategoryDefinition[] {
  return [...LAB_CATEGORIES].sort((a, b) => a.sortOrder - b.sortOrder);
}

/** Lookup a catalog metric by canonical key. */
export function getLabMetricByKey(metricKey: string): LabMetricDefinition | undefined {
  return METRIC_BY_KEY.get(metricKey);
}

/** Resolve a raw lab label to a catalog metric via aliases (case-insensitive). */
export function findLabMetricByAlias(rawName: string): LabMetricDefinition | undefined {
  const normalized = normalizeAlias(rawName);
  return ALIAS_INDEX.get(normalized);
}

/** All catalog metrics — lab-only biomarkers. */
export function getAllLabMetrics(): LabMetricDefinition[] {
  return [...LAB_METRICS];
}

/** Group latest per-metric results into category cards. */
export function groupLabResultsByCategory(
  results: LabMetricResultLike[],
): LabResultsByCategory[] {
  const latestByKey = new Map<string, LabMetricResultLike>();

  for (const result of results) {
    const existing = latestByKey.get(result.metricKey);
    const resultDate = result.collectedAt ?? result.reportedAt ?? "";
    const existingDate = existing?.collectedAt ?? existing?.reportedAt ?? "";
    if (!existing || resultDate.localeCompare(existingDate) > 0) {
      latestByKey.set(result.metricKey, result);
    }
  }

  return getLabCategories().map((category) => ({
    category,
    metrics: category.metricKeys
      .map((metricKey) => {
        const definition = getLabMetricByKey(metricKey);
        if (!definition) return null;
        return {
          definition,
          latest: latestByKey.get(metricKey) ?? null,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row != null)
      .sort((a, b) => a.definition.sortOrder - b.definition.sortOrder),
  }));
}

/** Format a numeric lab value for display; returns em dash when missing. */
export function formatLabResultValue(
  value: number | null | undefined,
  unit: string | null | undefined,
  options?: { rawValueText?: string | null; preferredUnit?: string },
): string {
  if (value == null || !Number.isFinite(value)) {
    if (options?.rawValueText?.trim()) return options.rawValueText.trim();
    return "—";
  }
  const displayUnit = unit?.trim() || options?.preferredUnit || "";
  const formatted = Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
  return displayUnit ? `${formatted} ${displayUnit}` : formatted;
}

/** Human-readable reference range when available. */
export function formatLabReferenceRange(result: LabMetricResultLike): string | null {
  if (result.referenceRangeText?.trim()) return result.referenceRangeText.trim();
  const low = result.referenceRangeLow;
  const high = result.referenceRangeHigh;
  const unit = result.unit?.trim() ?? "";
  if (low != null && high != null) {
    return `${low}–${high}${unit ? ` ${unit}` : ""}`;
  }
  if (low != null) return `≥ ${low}${unit ? ` ${unit}` : ""}`;
  if (high != null) return `≤ ${high}${unit ? ` ${unit}` : ""}`;
  return null;
}
