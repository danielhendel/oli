// lib/labs/labMetricCatalog.ts
// Canonical lab biomarker taxonomy — pure helpers, no I/O.

import { selectRepresentativeLabResult } from "./history/selectRepresentativeLabResult";
import { isLabReferenceLikeDisplayRow } from "./labSourceDisplay";

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
  id?: string;
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
  panelName?: string | null;
  sourcePage?: number;
  sourceValueRole?: string | null;
  publicationMode?: "auto" | "user" | null;
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
  M("lp_pla2", "cardiovascular", "Lp-PLA2", ["lipoprotein-associated phospholipase a2", "pla2"], ["nmol/min/mL", "ng/mL"], "nmol/min/mL", 100),
  M("non_hdl_c", "cardiovascular", "Non-HDL Cholesterol", ["non-hdl cholesterol", "non hdl cholesterol", "non-hdl-c", "non hdl-c"], ["mg/dL", "mmol/L"], "mg/dL", 110),
  M("chol_hdl_ratio", "cardiovascular", "Cholesterol/HDL Ratio", ["chol/hdlc ratio", "chol hdlc ratio", "total cholesterol/hdl", "tc/hdl"], ["ratio"], "ratio", 120, "ratio"),
  M("ldl_medium", "cardiovascular", "Medium LDL-P", ["ldl medium", "medium ldl", "medium ldl-p"], ["nmol/L"], "nmol/L", 130),
  M("hdl_large", "cardiovascular", "Large HDL-P", ["hdl large", "large hdl", "large hdl-p"], ["nmol/L"], "nmol/L", 140),
  M("ldl_peak_size", "cardiovascular", "LDL Peak Size", ["ldl peak size", "ldl size"], ["Angstrom", "nm"], "Angstrom", 150),
  M("ldl_pattern", "cardiovascular", "LDL Pattern", ["ldl pattern", "ldl pattern a", "ldl pattern b"], ["none"], "none", 160, "text"),

  // Metabolic Health
  M("glucose", "metabolic", "Glucose", ["fasting glucose", "blood glucose", "glu"], ["mg/dL", "mmol/L"], "mg/dL", 10),
  M("hba1c", "metabolic", "HbA1c", ["a1c", "hemoglobin a1c", "hba1c"], ["%", "mmol/mol"], "%", 20),
  M("eag", "metabolic", "Estimated Average Glucose", ["eag", "eag mg/dl", "eag mmol/l", "estimated average glucose"], ["mg/dL", "mmol/L"], "mg/dL", 25),
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
  M("serum_globulin", "liver", "Globulin", ["globulin", "serum globulin", "globulin, serum"], ["g/dL", "g/L"], "g/dL", 80),
  M("albumin_globulin_ratio", "liver", "Albumin/Globulin Ratio", ["a/g ratio", "albumin/globulin", "albumin globulin ratio"], ["ratio"], "ratio", 90, "ratio"),
  M("ldh", "liver", "LDH", ["ld", "lactate dehydrogenase", "lactic dehydrogenase"], ["U/L", "IU/L"], "U/L", 100),

  // Kidney Health
  M("creatinine", "kidney", "Creatinine", ["creat", "scr"], ["mg/dL", "umol/L"], "mg/dL", 10),
  M("egfr", "kidney", "eGFR", ["estimated gfr", "gfr"], ["mL/min/1.73m2", "mL/min"], "mL/min/1.73m2", 20),
  M("bun", "kidney", "BUN", ["blood urea nitrogen", "urea nitrogen"], ["mg/dL", "mmol/L"], "mg/dL", 30),
  M("bun_creatinine_ratio", "kidney", "BUN/Creatinine Ratio", ["bun/creat", "bun:creat"], ["ratio"], "ratio", 40, "ratio"),
  M("cystatin_c", "kidney", "Cystatin C", ["cystatin-c"], ["mg/L", "mg/dL"], "mg/L", 50),
  M("urine_albumin_creatinine_ratio", "kidney", "Urine Albumin/Creatinine Ratio", ["uacr", "albumin/creatinine ratio", "microalbumin/creatinine"], ["mg/g", "mg/mmol"], "mg/g", 60, "ratio"),
  M("uric_acid", "kidney", "Uric Acid", ["urate", "uric acid, serum"], ["mg/dL", "umol/L"], "mg/dL", 70),
  M("osmolality_serum", "kidney", "Serum Osmolality", ["osmolality", "osmolality, serum", "serum osmolality"], ["mOsm/kg", "mOsm/L"], "mOsm/kg", 80),
  M("osmolality_urine", "kidney", "Urine Osmolality", ["osmolality (u)", "osmolality, urine", "urine osmolality", "osmolality u"], ["mOsm/kg", "mOsm/L"], "mOsm/kg", 85),

  // Blood & Iron
  M("wbc", "blood_iron", "WBC", ["white blood cell count", "leukocytes"], ["10^3/uL", "K/uL"], "10^3/uL", 10),
  M("rbc", "blood_iron", "RBC", ["red blood cell count", "erythrocytes"], ["10^6/uL", "M/uL"], "10^6/uL", 20),
  M("hemoglobin", "blood_iron", "Hemoglobin", ["hgb", "hb"], ["g/dL", "g/L"], "g/dL", 30),
  M("hematocrit", "blood_iron", "Hematocrit", ["hct"], ["%", "L/L"], "%", 40),
  M("mcv", "blood_iron", "MCV", ["mean corpuscular volume"], ["fL"], "fL", 42),
  M("mch", "blood_iron", "MCH", ["mean corpuscular hemoglobin"], ["pg"], "pg", 44),
  M("mchc", "blood_iron", "MCHC", ["mean corpuscular hemoglobin concentration"], ["g/dL"], "g/dL", 46),
  M("rdw", "blood_iron", "RDW", ["red cell distribution width", "rdw-cv"], ["%"], "%", 48),
  M("platelets", "blood_iron", "Platelets", ["plt", "platelet count"], ["10^3/uL", "K/uL"], "10^3/uL", 50),
  M("mpv", "blood_iron", "MPV", ["mean platelet volume"], ["fL"], "fL", 52),
  M("neutrophils_pct", "blood_iron", "Neutrophils %", ["neutrophils", "neutrophil", "neutrophils %"], ["%"], "%", 54),
  M("lymphocytes_pct", "blood_iron", "Lymphocytes %", ["lymphocytes", "lymphocyte", "lymphocytes %"], ["%"], "%", 56),
  M("monocytes_pct", "blood_iron", "Monocytes %", ["monocytes", "monocyte", "monocytes %"], ["%"], "%", 58),
  M("eosinophils_pct", "blood_iron", "Eosinophils %", ["eosinophils", "eosinophil", "eosinophils %"], ["%"], "%", 60),
  M("basophils_pct", "blood_iron", "Basophils %", ["basophils", "basophil", "basophils %"], ["%"], "%", 62),
  M("absolute_neutrophils", "blood_iron", "Absolute Neutrophils", ["neutrophils absolute", "anc"], ["10^3/uL", "Thousand/uL", "K/uL"], "10^3/uL", 64),
  M("absolute_lymphocytes", "blood_iron", "Absolute Lymphocytes", ["lymphocytes absolute", "alc"], ["10^3/uL", "Thousand/uL", "K/uL"], "10^3/uL", 66),
  M("absolute_monocytes", "blood_iron", "Absolute Monocytes", ["monocytes absolute"], ["10^3/uL", "Thousand/uL", "K/uL"], "10^3/uL", 68),
  M("absolute_eosinophils", "blood_iron", "Absolute Eosinophils", ["eosinophils absolute"], ["10^3/uL", "Thousand/uL", "K/uL"], "10^3/uL", 70),
  M("absolute_basophils", "blood_iron", "Absolute Basophils", ["basophils absolute"], ["10^3/uL", "Thousand/uL", "K/uL"], "10^3/uL", 72),
  M("ferritin", "blood_iron", "Ferritin", ["fer"], ["ng/mL", "ug/L"], "ng/mL", 80),
  M("iron", "blood_iron", "Iron", ["serum iron", "fe"], ["ug/dL", "umol/L"], "ug/dL", 90),
  M("tibc", "blood_iron", "TIBC", ["total iron binding capacity"], ["ug/dL", "umol/L"], "ug/dL", 100),
  M("transferrin", "blood_iron", "Transferrin", ["transferrin, serum"], ["mg/dL", "g/L"], "mg/dL", 105),
  M("transferrin_saturation", "blood_iron", "Transferrin Saturation", ["tsat", "iron saturation"], ["%"], "%", 110, "ratio"),
  M("immunoglobulin_a", "blood_iron", "Immunoglobulin A", ["iga", "immunoglobulin a", "igg a"], ["mg/dL", "g/L"], "mg/dL", 120),

  // Hormones + Thyroid
  M("tsh", "hormones_thyroid", "TSH", ["thyroid stimulating hormone"], ["mIU/L", "uIU/mL"], "mIU/L", 10),
  M("free_t4", "hormones_thyroid", "Free T4", ["ft4", "free thyroxine"], ["ng/dL", "pmol/L"], "ng/dL", 20),
  M("free_t3", "hormones_thyroid", "Free T3", ["ft3", "free triiodothyronine"], ["pg/mL", "pmol/L"], "pg/mL", 30),
  M("total_testosterone", "hormones_thyroid", "Total Testosterone", ["testosterone, total", "testosterone"], ["ng/dL", "nmol/L"], "ng/dL", 40),
  M("free_testosterone", "hormones_thyroid", "Free Testosterone", ["testosterone, free"], ["pg/mL", "ng/dL"], "pg/mL", 50),
  M(
    "bioavailable_testosterone",
    "hormones_thyroid",
    "Bioavailable Testosterone",
    ["testosterone, bioavailable", "testosterone bioavailable", "bioavailable testosterone"],
    ["ng/dL", "nmol/L"],
    "ng/dL",
    55,
  ),
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
  M("mercury_blood", "nutritional", "Mercury (Blood)", ["mercury", "mercury, blood", "blood mercury"], ["ug/L", "nmol/L"], "ug/L", 70),

  // Inflammation + Immune (hs_crp shared with cardiovascular)
  M("crp", "inflammation", "CRP", ["c-reactive protein", "crp, standard"], ["mg/L", "mg/dL"], "mg/L", 20),
  M("esr", "inflammation", "ESR", ["sed rate", "erythrocyte sedimentation rate"], ["mm/hr"], "mm/hr", 30),
  M("homocysteine", "inflammation", "Homocysteine", ["hcy"], ["umol/L", "mg/L"], "umol/L", 40),
  M("interleukin_6", "inflammation", "Interleukin-6", ["il-6", "il6", "interleukin 6", "interleukin-6", "interleukin"], ["pg/mL", "ng/L"], "pg/mL", 50),

  // Muscle / other metabolic enzymes
  M("creatine_kinase", "inflammation", "Creatine Kinase", ["ck", "cpk", "creatine kinase total", "creatine kinase, total"], ["U/L", "IU/L"], "U/L", 60),

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

  // Infectious / serology (qualitative)
  M(
    "sars_cov2_igg",
    "inflammation",
    "SARS-CoV-2 IgG",
    ["sars-cov-2 igg", "sars cov 2 ab igg", "sars-cov-2 antibody igg"],
    ["none"],
    "none",
    200,
    "text",
  ),
  M(
    "sars_cov2_igm",
    "inflammation",
    "SARS-CoV-2 IgM",
    ["sars-cov-2 igm", "sars cov 2 ab igm", "sars-cov-2 antibody igm"],
    ["none"],
    "none",
    210,
    "text",
  ),
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
      "non_hdl_c",
      "chol_hdl_ratio",
      "apob",
      "lpa",
      "hs_crp",
      "ldl_particle_number",
      "small_ldl_p",
      "ldl_medium",
      "hdl_large",
      "ldl_peak_size",
      "ldl_pattern",
      "lp_pla2",
    ],
  },
  {
    categoryKey: "metabolic",
    displayName: "Metabolic Health",
    sortOrder: 20,
    metricKeys: ["glucose", "hba1c", "eag", "fasting_insulin", "homa_ir", "c_peptide"],
  },
  {
    categoryKey: "liver",
    displayName: "Liver Health",
    sortOrder: 30,
    metricKeys: [
      "alt",
      "ast",
      "alp",
      "ggt",
      "total_bilirubin",
      "albumin",
      "total_protein",
      "serum_globulin",
      "albumin_globulin_ratio",
      "ldh",
    ],
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
      "uric_acid",
      "osmolality_serum",
      "osmolality_urine",
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
      "mcv",
      "mch",
      "mchc",
      "rdw",
      "platelets",
      "mpv",
      "neutrophils_pct",
      "lymphocytes_pct",
      "monocytes_pct",
      "eosinophils_pct",
      "basophils_pct",
      "absolute_neutrophils",
      "absolute_lymphocytes",
      "absolute_monocytes",
      "absolute_eosinophils",
      "absolute_basophils",
      "ferritin",
      "iron",
      "tibc",
      "transferrin",
      "transferrin_saturation",
      "immunoglobulin_a",
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
      "bioavailable_testosterone",
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
    metricKeys: ["vitamin_d", "vitamin_b12", "folate", "magnesium_rbc", "zinc", "omega_3_index", "mercury_blood"],
  },
  {
    categoryKey: "inflammation",
    displayName: "Inflammation + Immune",
    sortOrder: 80,
    metricKeys: [
      "hs_crp",
      "crp",
      "esr",
      "homocysteine",
      "interleukin_6",
      "creatine_kinase",
      "sars_cov2_igg",
      "sars_cov2_igm",
    ],
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
  const byMetric = new Map<string, LabMetricResultLike[]>();
  for (const result of results) {
    const list = byMetric.get(result.metricKey) ?? [];
    list.push(result);
    byMetric.set(result.metricKey, list);
  }

  const inferCmp = (raw: string | null | undefined): "eq" | "lt" | "lte" | "gt" | "gte" => {
    const t = (raw ?? "").trim();
    if (/^≤/.test(t) || /^<=/.test(t)) return "lte";
    if (/^≥/.test(t) || /^>=/.test(t)) return "gte";
    if (/^</.test(t)) return "lt";
    if (/^>/.test(t)) return "gt";
    return "eq";
  };

  const isReferenceLikeRow = (row: LabMetricResultLike): boolean =>
    isLabReferenceLikeDisplayRow({
      sourceValueRole: row.sourceValueRole,
      rawValueText: row.rawValueText,
      comparator: inferCmp(row.rawValueText),
    });

  const latestByKey = new Map<string, LabMetricResultLike | null>();
  for (const [metricKey, list] of byMetric) {
    const maxDate = list.reduce((best, row) => {
      const d = row.collectedAt ?? row.reportedAt ?? "";
      return d.localeCompare(best) > 0 ? d : best;
    }, "");
    const sameDate = list.filter((row) => (row.collectedAt ?? row.reportedAt ?? "") === maxDate);
    // Never display reference thresholds / risk bands as personal results.
    const eligible = sameDate.filter((row) => !isReferenceLikeRow(row));
    if (eligible.length === 0) {
      latestByKey.set(metricKey, null);
      continue;
    }
    if (eligible.length === 1) {
      latestByKey.set(metricKey, eligible[0]!);
      continue;
    }
    // Panel/role-aware representative selection — never prefer reference thresholds.
    const rep = selectRepresentativeLabResult({
      metricId: metricKey,
      candidates: eligible.map((row, idx) => ({
        id: String(row.id ?? `${metricKey}_${idx}`),
        canonicalMetricId: metricKey,
        panelName: row.panelName ?? null,
        result:
          row.value != null
            ? {
                kind: "numeric",
                value: row.value,
                comparator: inferCmp(row.rawValueText),
              }
            : row.rawValueText
              ? { kind: "text", value: row.rawValueText }
              : null,
        collectedAt: row.collectedAt ?? null,
        normalizedUnit: row.unit ?? null,
        ...(typeof row.sourcePage === "number" ? { sourcePage: row.sourcePage } : {}),
        sourceValueRole: row.sourceValueRole ?? null,
        reviewStatus: row.publicationMode === "user" ? ("user" as const) : ("auto" as const),
        rawValueText: row.rawValueText ?? null,
      })),
    });
    const chosen =
      eligible.find((row, idx) => String(row.id ?? `${metricKey}_${idx}`) === rep?.id) ?? eligible[0]!;
    latestByKey.set(metricKey, chosen);
  }

  return getLabCategories().map((category) => ({
    category,
    metrics: category.metricKeys
      .map((metricKey) => {
        const definition = getLabMetricByKey(metricKey);
        if (!definition) return null;
        return {
          definition,
          latest: latestByKey.has(metricKey) ? latestByKey.get(metricKey)! : null,
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
  options?: {
    rawValueText?: string | null;
    preferredUnit?: string;
    comparator?: "eq" | "lt" | "lte" | "gt" | "gte" | null;
  },
): string {
  const normalizeDisplayUnit = (u: string | null | undefined): string => {
    const t = (u ?? "").trim();
    if (!t || /^none$/i.test(t)) return "";
    return t;
  };

  if (options?.rawValueText?.trim()) {
    const raw = options.rawValueText.trim();
    const looksInequality = /^[<>≤≥]/.test(raw) || /^(?:<=|>=)/.test(raw);
    const comparatorForcesRaw = Boolean(options.comparator && options.comparator !== "eq");
    if (value == null || !Number.isFinite(value) || looksInequality || comparatorForcesRaw) {
      const displayUnit =
        normalizeDisplayUnit(unit) || normalizeDisplayUnit(options?.preferredUnit);
      if (displayUnit && !raw.toLowerCase().includes(displayUnit.toLowerCase())) {
        return `${raw} ${displayUnit}`;
      }
      return raw;
    }
  }
  if (value == null || !Number.isFinite(value)) {
    if (options?.rawValueText?.trim()) return options.rawValueText.trim();
    return "—";
  }
  const displayUnit = normalizeDisplayUnit(unit) || normalizeDisplayUnit(options?.preferredUnit);
  const formatted = Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
  const cmp = options?.comparator;
  const withCmp =
    cmp && cmp !== "eq"
      ? `${cmp === "lt" ? "<" : cmp === "lte" ? "≤" : cmp === "gt" ? ">" : "≥"}${formatted}`
      : formatted;
  return displayUnit ? `${withCmp} ${displayUnit}` : withCmp;
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
