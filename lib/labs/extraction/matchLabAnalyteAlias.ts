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
    .replace(/\b(?:ms|ia|ez|lc ms|lc\/ms|immunoassay|calculated|calc)\b/g, " ")
    .replace(/\b(?:serum|plasma|urine|blood|whole blood)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (withoutMethod && withoutMethod !== base) keys.push(withoutMethod);
  // Drop trailing assay tokens one at a time for "TESTOSTERONE TOTAL MS" style labels.
  const parts = withoutMethod.split(" ");
  for (let i = parts.length - 1; i >= 2; i--) {
    keys.push(parts.slice(0, i).join(" "));
  }
  // Keep short IL-6 / numbered analyte stems (e.g. "interleukin 6").
  if (parts.length >= 2) keys.push(parts.slice(0, 2).join(" "));
  return [...new Set(keys.filter(Boolean))];
}

/** Extra Quest/DirectLabs label forms not already on catalog aliases. */
const EXTRA_ALIASES: readonly { metricKey: string; aliases: readonly string[] }[] = [
  // Cardiovascular
  { metricKey: "ldl_c", aliases: ["ldl-cholesterol", "ldl cholesterol", "cholesterol ldl", "ldl chol"] },
  { metricKey: "hdl_c", aliases: ["hdl-cholesterol", "hdl cholesterol", "cholesterol hdl", "hdl chol"] },
  { metricKey: "total_cholesterol", aliases: ["cholesterol, total", "cholesterol total", "cholesterol"] },
  { metricKey: "triglycerides", aliases: ["triglyceride", "trig", "trigs"] },
  { metricKey: "apob", aliases: ["apolipoprotein b", "apo-b", "apo b", "apolipoprotein b-100", "apo b-100"] },
  { metricKey: "lpa", aliases: ["lipoprotein (a)", "lipoprotein(a)", "lp(a)", "lp a", "lipoprotein a"] },
  { metricKey: "hs_crp", aliases: ["c-reactive protein cardiac", "crp cardiac", "hs crp", "hscrp", "crp high sensitivity"] },
  { metricKey: "ldl_particle_number", aliases: ["ldl-p", "ldl particle number", "ldl p", "ldl-p number"] },
  { metricKey: "small_ldl_p", aliases: ["small ldl-p", "small dense ldl-p", "ldl small", "small ldl", "small dense ldl"] },
  {
    metricKey: "lp_pla2",
    aliases: [
      "lp-pla2",
      "lp pla2",
      "lp-pla2 activity",
      "lp pla2 activity",
      "lipoprotein associated phospholipase a2",
      "pla2 activity",
    ],
  },
  { metricKey: "non_hdl_c", aliases: ["non hdl cholesterol", "non-hdl cholesterol", "non-hdl-c", "non hdl-c", "non hdl"] },
  {
    metricKey: "chol_hdl_ratio",
    aliases: ["chol/hdlc ratio", "chol hdlc ratio", "cholesterol/hdl ratio", "tc/hdl ratio", "chol/hdl ratio"],
  },
  { metricKey: "ldl_medium", aliases: ["ldl medium", "medium ldl-p", "medium ldl", "ldl-p medium"] },
  { metricKey: "hdl_large", aliases: ["hdl large", "large hdl-p", "large hdl", "hdl-p large"] },
  { metricKey: "ldl_peak_size", aliases: ["ldl peak size", "ldl size", "peak size ldl"] },
  { metricKey: "ldl_pattern", aliases: ["ldl pattern", "ldl pattern a", "ldl pattern b", "ldl phenotype"] },

  // Metabolic
  { metricKey: "glucose", aliases: ["glucose, fasting", "glucose fasting", "fasting blood glucose", "blood glucose", "glu"] },
  { metricKey: "hba1c", aliases: ["hemoglobin a1c", "hemoglobin a1c %", "hb a1c", "hgb a1c", "a1c", "glycohemoglobin", "glycated hemoglobin"] },
  { metricKey: "eag", aliases: ["eag", "eag mg/dl", "eag mmol/l", "estimated average glucose", "average glucose"] },
  { metricKey: "fasting_insulin", aliases: ["insulin, fasting", "insulin fasting", "insulin"] },
  { metricKey: "c_peptide", aliases: ["c-peptide", "c peptide", "c-pep"] },

  // Liver
  { metricKey: "alt", aliases: ["alt (sgpt)", "alt sgpt", "alanine aminotransferase", "sgpt"] },
  { metricKey: "ast", aliases: ["ast (sgot)", "ast sgot", "aspartate aminotransferase", "sgot"] },
  { metricKey: "alp", aliases: ["alkaline phosphatase", "alk phos", "alkaline phos"] },
  { metricKey: "ggt", aliases: ["gamma glutamyl transferase", "gamma-glutamyl transferase", "ggtp", "ggt"] },
  { metricKey: "total_bilirubin", aliases: ["bilirubin, total", "bilirubin total", "tbili", "t.bili", "total bili"] },
  { metricKey: "albumin", aliases: ["albumin, serum", "albumin serum", "alb"] },
  { metricKey: "total_protein", aliases: ["protein, total", "protein total", "total protein"] },
  { metricKey: "serum_globulin", aliases: ["globulin", "globulin, serum", "serum globulin", "calculated globulin"] },
  {
    metricKey: "albumin_globulin_ratio",
    aliases: ["albumin/globulin ratio", "a/g ratio", "albumin globulin ratio", "ag ratio"],
  },
  { metricKey: "ldh", aliases: ["ld", "ldh", "lactate dehydrogenase", "lactic dehydrogenase"] },

  // Kidney
  { metricKey: "creatinine", aliases: ["creatinine, serum", "creatinine serum", "creat", "serum creatinine", "scr"] },
  {
    metricKey: "egfr",
    aliases: [
      "estimated gfr",
      "gfr",
      "egfr non-afr american",
      "egfr non afr american",
      "egfr non african american",
      "egfr african american",
      "glomerular filtration rate estimated",
    ],
  },
  { metricKey: "bun", aliases: ["blood urea nitrogen", "urea nitrogen", "urea nitrogen (bun)", "urea nitrogen bun"] },
  { metricKey: "bun_creatinine_ratio", aliases: ["bun/creatinine", "bun creatinine", "bun/creat", "bun creat ratio"] },
  { metricKey: "cystatin_c", aliases: ["cystatin-c", "cystatin c"] },
  {
    metricKey: "urine_albumin_creatinine_ratio",
    aliases: ["uacr", "albumin/creatinine ratio", "microalbumin/creatinine", "urine microalbumin/creatinine"],
  },
  { metricKey: "uric_acid", aliases: ["uric acid", "urate", "uric acid, serum", "uric acid serum"] },
  {
    metricKey: "osmolality_serum",
    aliases: ["osmolality", "osmolality, serum", "serum osmolality", "osmolality, calculated"],
  },
  {
    metricKey: "osmolality_urine",
    aliases: ["osmolality (u)", "osmolality u", "osmolality, urine", "urine osmolality", "osmolality(u)"],
  },

  // Blood & iron
  { metricKey: "wbc", aliases: ["white blood cell count", "wbc count", "leukocyte count", "leukocytes"] },
  { metricKey: "rbc", aliases: ["red blood cell count", "rbc count", "erythrocyte count", "erythrocytes"] },
  { metricKey: "hemoglobin", aliases: ["hemoglobin", "hgb", "hb"] },
  { metricKey: "hematocrit", aliases: ["hematocrit", "hct", "crit"] },
  { metricKey: "mcv", aliases: ["mcv", "mean corpuscular volume", "mean cell volume"] },
  { metricKey: "mch", aliases: ["mch", "mean corpuscular hemoglobin", "mean cell hemoglobin"] },
  { metricKey: "mchc", aliases: ["mchc", "mean corpuscular hemoglobin concentration"] },
  { metricKey: "rdw", aliases: ["rdw", "rdw-cv", "red cell distribution width"] },
  { metricKey: "platelets", aliases: ["platelet count", "plt", "plt count", "thrombocytes"] },
  { metricKey: "mpv", aliases: ["mpv", "mean platelet volume"] },
  { metricKey: "neutrophils_pct", aliases: ["neutrophils", "neutrophil", "neutrophils %", "neutrophil %"] },
  { metricKey: "lymphocytes_pct", aliases: ["lymphocytes", "lymphocyte", "lymphocytes %", "lymphocyte %"] },
  { metricKey: "monocytes_pct", aliases: ["monocytes", "monocyte", "monocytes %", "monocyte %"] },
  { metricKey: "eosinophils_pct", aliases: ["eosinophils", "eosinophil", "eosinophils %", "eosinophil %"] },
  { metricKey: "basophils_pct", aliases: ["basophils", "basophil", "basophils %", "basophil %"] },
  {
    metricKey: "absolute_neutrophils",
    aliases: ["absolute neutrophils", "neutrophils absolute", "absolute neutrophil", "anc"],
  },
  {
    metricKey: "absolute_lymphocytes",
    aliases: ["absolute lymphocytes", "lymphocytes absolute", "absolute lymphocyte", "alc"],
  },
  { metricKey: "absolute_monocytes", aliases: ["absolute monocytes", "monocytes absolute", "absolute monocyte"] },
  { metricKey: "absolute_eosinophils", aliases: ["absolute eosinophils", "eosinophils absolute", "absolute eosinophil"] },
  { metricKey: "absolute_basophils", aliases: ["absolute basophils", "basophils absolute", "absolute basophil"] },
  { metricKey: "ferritin", aliases: ["ferritin, serum", "ferritin serum", "fer"] },
  { metricKey: "iron", aliases: ["iron, total", "iron total", "iron, serum", "iron serum", "serum iron", "fe"] },
  { metricKey: "tibc", aliases: ["total iron binding capacity", "iron binding capacity", "tibc"] },
  { metricKey: "transferrin", aliases: ["transferrin", "transferrin, serum", "serum transferrin"] },
  { metricKey: "transferrin_saturation", aliases: ["tsat", "iron saturation", "transferrin sat", "% saturation"] },
  { metricKey: "immunoglobulin_a", aliases: ["immunoglobulin a", "iga", "immunoglobulin a serum", "iga serum"] },

  // Hormones + thyroid
  { metricKey: "tsh", aliases: ["tsh", "thyroid stimulating hormone", "thyrotropin"] },
  { metricKey: "free_t4", aliases: ["t4 free", "free t4", "t4, free", "thyroxine free", "free thyroxine", "ft4"] },
  { metricKey: "free_t3", aliases: ["t3 free", "free t3", "t3, free", "triiodothyronine free", "free triiodothyronine", "ft3"] },
  {
    metricKey: "total_testosterone",
    aliases: [
      "testosterone total ms",
      "testosterone, total, ms",
      "testosterone total",
      "testosterone, total",
      "testosterone",
    ],
  },
  {
    metricKey: "free_testosterone",
    aliases: ["testosterone free", "testosterone, free", "free testosterone", "testosterone free ms"],
  },
  {
    metricKey: "bioavailable_testosterone",
    aliases: [
      "testosterone, bioavailable",
      "testosterone bioavailable",
      "bioavailable testosterone",
      "testosterone bioavailable calculated",
    ],
  },
  { metricKey: "shbg", aliases: ["sex hormone binding globulin", "sex hormone-binding globulin", "shbg"] },
  { metricKey: "estradiol", aliases: ["estradiol", "estradiol ultrasensitive", "e2", "estrogen"] },
  { metricKey: "dhea_s", aliases: ["dhea sulfate", "dhea-s", "dheas", "dehydroepiandrosterone sulfate"] },
  { metricKey: "lh", aliases: ["luteinizing hormone", "lh"] },
  { metricKey: "fsh", aliases: ["follicle stimulating hormone", "follicle-stimulating hormone", "fsh"] },
  { metricKey: "prolactin", aliases: ["prolactin", "prl"] },
  { metricKey: "cortisol", aliases: ["cortisol, total", "cortisol total", "cortisol, serum", "cortisol am", "cortisol, am"] },

  // Nutritional
  {
    metricKey: "vitamin_d",
    aliases: [
      "vitamin d, 25-hydroxy",
      "25-hydroxyvitamin d",
      "vitamin d 25-oh",
      "vitamin d 25 oh total",
      "vitamin d 25-oh total",
      "25 oh vitamin d",
      "25(oh)d",
      "vit d 25 oh",
    ],
  },
  { metricKey: "vitamin_b12", aliases: ["vitamin b12", "b12", "cobalamin", "vitamin b-12"] },
  { metricKey: "folate", aliases: ["folate, serum", "folate serum", "folic acid", "serum folate"] },
  { metricKey: "magnesium_rbc", aliases: ["magnesium, rbc", "rbc magnesium", "magnesium rbc"] },
  { metricKey: "zinc", aliases: ["serum zinc", "zinc, serum", "zn"] },
  { metricKey: "omega_3_index", aliases: ["omega 3 index", "omega-3", "omega-3 index"] },
  { metricKey: "mercury_blood", aliases: ["mercury, blood", "mercury blood", "blood mercury", "mercury"] },

  // Inflammation
  { metricKey: "crp", aliases: ["c-reactive protein", "crp, standard", "crp standard"] },
  { metricKey: "esr", aliases: ["sed rate", "erythrocyte sedimentation rate", "sedimentation rate"] },
  { metricKey: "homocysteine", aliases: ["homocysteine", "hcy"] },
  {
    metricKey: "interleukin_6",
    aliases: ["interleukin-6", "interleukin 6", "il-6", "il6", "interleukin", "il 6"],
  },
  {
    metricKey: "creatine_kinase",
    aliases: ["creatine kinase", "creatine kinase, total", "creatine kinase total", "ck", "cpk", "ck total"],
  },

  // Electrolytes
  { metricKey: "sodium", aliases: ["sodium", "na", "serum sodium", "sodium serum"] },
  { metricKey: "potassium", aliases: ["potassium", "k", "serum potassium", "potassium serum"] },
  { metricKey: "chloride", aliases: ["chloride", "cl", "serum chloride", "chloride serum"] },
  { metricKey: "co2_bicarbonate", aliases: ["carbon dioxide", "co2 content", "co2", "bicarbonate", "hco3", "co2 bicarbonate"] },
  { metricKey: "calcium", aliases: ["calcium", "ca", "serum calcium", "calcium, total", "calcium total"] },
  { metricKey: "magnesium_serum", aliases: ["magnesium, serum", "serum magnesium", "magnesium serum"] },
  { metricKey: "phosphorus", aliases: ["phosphate (as phosphorus)", "phosphate as phosphorus", "phosphate", "phos", "phosphorus"] },

  // Prostate
  { metricKey: "psa", aliases: ["prostate specific antigen", "psa, total", "psa total", "total psa"] },
  { metricKey: "free_psa", aliases: ["psa, free", "psa free", "free psa"] },

  // SARS-CoV-2 serology (qualitative)
  {
    metricKey: "sars_cov2_igg",
    aliases: [
      "sars cov 2 ab igg",
      "sars-cov-2 igg",
      "sars cov-2 igg",
      "sars-cov-2 antibody igg",
      "covid-19 igg",
    ],
  },
  {
    metricKey: "sars_cov2_igm",
    aliases: [
      "sars cov 2 ab igm",
      "sars-cov-2 igm",
      "sars cov-2 igm",
      "sars-cov-2 antibody igm",
      "covid-19 igm",
    ],
  },
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
      // Curated provider-specific forms are approved exact aliases (not fuzzy).
      push(normalizeLabel(alias), { metricKey: extra.metricKey, method: "exact_alias" });
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
