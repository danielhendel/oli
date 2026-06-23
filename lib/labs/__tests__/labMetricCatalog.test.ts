// lib/labs/__tests__/labMetricCatalog.test.ts
import {
  findLabMetricByAlias,
  formatLabResultValue,
  getAllLabMetrics,
  getLabCategories,
  getLabMetricByKey,
  groupLabResultsByCategory,
} from "@/lib/labs/labMetricCatalog";

describe("labMetricCatalog", () => {
  it("returns a stable category list", () => {
    const first = getLabCategories().map((c) => c.categoryKey);
    const second = getLabCategories().map((c) => c.categoryKey);
    expect(first).toEqual(second);
    expect(first).toHaveLength(10);
    expect(first[0]).toBe("cardiovascular");
  });

  it("resolves aliases correctly", () => {
    expect(findLabMetricByAlias("LDL-C")?.metricKey).toBe("ldl_c");
    expect(findLabMetricByAlias("hdl cholesterol")?.metricKey).toBe("hdl_c");
    expect(findLabMetricByAlias("25-hydroxyvitamin d")?.metricKey).toBe("vitamin_d");
    expect(findLabMetricByAlias("not a real marker")).toBeUndefined();
  });

  it("only includes lab metrics in catalog", () => {
    const keys = getAllLabMetrics().map((m) => m.metricKey);
    expect(keys).toContain("ldl_c");
    expect(keys).toContain("tsh");
    expect(keys).not.toContain("steps");
    expect(keys).not.toContain("weight");
  });

  it("groups results by category with latest per metric", () => {
    const grouped = groupLabResultsByCategory([
      {
        metricKey: "ldl_c",
        value: 100,
        unit: "mg/dL",
        collectedAt: "2025-01-01T00:00:00.000Z",
      },
      {
        metricKey: "ldl_c",
        value: 92,
        unit: "mg/dL",
        collectedAt: "2025-06-01T00:00:00.000Z",
      },
      {
        metricKey: "glucose",
        value: 89,
        unit: "mg/dL",
        collectedAt: "2025-06-01T00:00:00.000Z",
      },
    ]);

    const cardio = grouped.find((g) => g.category.categoryKey === "cardiovascular");
    const ldl = cardio?.metrics.find((m) => m.definition.metricKey === "ldl_c");
    expect(ldl?.latest?.value).toBe(92);

    const metabolic = grouped.find((g) => g.category.categoryKey === "metabolic");
    expect(metabolic?.metrics.find((m) => m.definition.metricKey === "glucose")?.latest?.value).toBe(89);
  });

  it("formats missing values as em dash", () => {
    expect(formatLabResultValue(null, "mg/dL")).toBe("—");
    expect(formatLabResultValue(92, "mg/dL")).toBe("92 mg/dL");
  });

  it("looks up metrics by key", () => {
    expect(getLabMetricByKey("apob")?.displayName).toBe("ApoB");
    expect(getLabMetricByKey("missing")).toBeUndefined();
  });
});
