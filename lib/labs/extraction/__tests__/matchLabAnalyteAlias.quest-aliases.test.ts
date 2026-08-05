import { describe, expect, it } from "@jest/globals";
import { LABS_ALIAS_REGISTRY_VERSION } from "@oli/contracts";
import { getLabMetricByKey } from "../../labMetricCatalog";
import { matchLabAnalyteAlias } from "../matchLabAnalyteAlias";

/** Synthetic de-identified Quest/DirectLabs analyte labels → catalog metrics. */
const QUEST_LABEL_CASES: readonly { label: string; metricKey: string }[] = [
  { label: "LDL-CHOLESTEROL", metricKey: "ldl_c" },
  { label: "HDL CHOLESTEROL", metricKey: "hdl_c" },
  { label: "CHOLESTEROL, TOTAL", metricKey: "total_cholesterol" },
  { label: "TRIGLYCERIDES", metricKey: "triglycerides" },
  { label: "APOLIPOPROTEIN B", metricKey: "apob" },
  { label: "LIPOPROTEIN (a)", metricKey: "lpa" },
  { label: "HEMOGLOBIN A1c", metricKey: "hba1c" },
  { label: "HGB A1C", metricKey: "hba1c" },
  { label: "GLUCOSE, FASTING", metricKey: "glucose" },
  { label: "CREATININE, SERUM", metricKey: "creatinine" },
  { label: "eGFR NON-AFR AMERICAN", metricKey: "egfr" },
  { label: "ALT (SGPT)", metricKey: "alt" },
  { label: "AST (SGOT)", metricKey: "ast" },
  { label: "WBC", metricKey: "wbc" },
  { label: "RBC", metricKey: "rbc" },
  { label: "HEMOGLOBIN", metricKey: "hemoglobin" },
  { label: "HEMATOCRIT", metricKey: "hematocrit" },
  { label: "PLATELET COUNT", metricKey: "platelets" },
  { label: "TSH", metricKey: "tsh" },
  { label: "T4, FREE", metricKey: "free_t4" },
  { label: "T3, FREE", metricKey: "free_t3" },
  { label: "TESTOSTERONE, TOTAL, MS", metricKey: "total_testosterone" },
  { label: "TESTOSTERONE, FREE", metricKey: "free_testosterone" },
  { label: "VITAMIN D, 25-OH, TOTAL, IA", metricKey: "vitamin_d" },
  { label: "SODIUM", metricKey: "sodium" },
  { label: "POTASSIUM", metricKey: "potassium" },
  { label: "CHLORIDE", metricKey: "chloride" },
  { label: "CARBON DIOXIDE", metricKey: "co2_bicarbonate" },
  { label: "CALCIUM, TOTAL", metricKey: "calcium" },
  { label: "UREA NITROGEN (BUN)", metricKey: "bun" },
  { label: "ALBUMIN", metricKey: "albumin" },
  { label: "BILIRUBIN, TOTAL", metricKey: "total_bilirubin" },
  { label: "FERRITIN", metricKey: "ferritin" },
  { label: "IRON, TOTAL", metricKey: "iron" },
  { label: "PSA, TOTAL", metricKey: "psa" },
  { label: "CORTISOL, TOTAL", metricKey: "cortisol" },
  { label: "ESTRADIOL", metricKey: "estradiol" },
  { label: "SEX HORMONE BINDING GLOBULIN", metricKey: "shbg" },
];

describe("matchLabAnalyteAlias Quest/DirectLabs aliases", () => {
  it("only targets metrics that exist in the catalog", () => {
    for (const { metricKey } of QUEST_LABEL_CASES) {
      expect(getLabMetricByKey(metricKey)).toBeDefined();
    }
  });

  it.each(QUEST_LABEL_CASES)(
    "maps synthetic label $label → $metricKey",
    ({ label, metricKey }) => {
      const outcome = matchLabAnalyteAlias(label);
      expect(outcome.canonicalMetricId).toBe(metricKey);
      expect(outcome.matchMethod).not.toBe("unmatched");
      expect(outcome.aliasVersion).toBe(LABS_ALIAS_REGISTRY_VERSION);
    },
  );

  it("uses alias registry 1.2.0 after Report A catalog completion", () => {
    expect(LABS_ALIAS_REGISTRY_VERSION).toBe("1.2.0");
  });
});
