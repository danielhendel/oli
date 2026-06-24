// lib/classifications/__tests__/registry.test.ts
import {
  CLASSIFICATION_REGISTRY,
  getClassificationMetric,
  getMetricsForDomain,
  getRegistryVersion,
  listMetricIdsByDomain,
  validateClassificationRegistry,
} from "@/lib/classifications/registry";
import { CLASSIFICATION_DOMAINS } from "@/lib/classifications/types";

describe("classification registry", () => {
  it("has no validation errors", () => {
    expect(validateClassificationRegistry()).toEqual([]);
  });

  it("covers all 7 domains", () => {
    for (const domain of CLASSIFICATION_DOMAINS) {
      const metrics = getMetricsForDomain(domain);
      expect(metrics.length).toBeGreaterThan(0);
      expect(metrics.every((m) => m.domain === domain)).toBe(true);
    }
  });

  it("registry version is 1.0", () => {
    expect(getRegistryVersion()).toBe("1.0");
    expect(CLASSIFICATION_REGISTRY.every((m) => m.version === "1.0")).toBe(true);
  });

  it("lists unique metric IDs", () => {
    const ids = CLASSIFICATION_REGISTRY.map((m) => m.metricId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("getClassificationMetric resolves known metrics", () => {
    expect(getClassificationMetric("bmi")?.displayName).toBe("BMI");
    expect(getClassificationMetric("daily-steps")?.domain).toBe("activity");
    expect(getClassificationMetric("unknown-metric")).toBeUndefined();
  });

  it("listMetricIdsByDomain includes expected initial labs metrics", () => {
    const byDomain = listMetricIdsByDomain();
    expect(byDomain.labs).toEqual(
      expect.arrayContaining(["hba1c-percent", "systolic-bp", "diastolic-bp"]),
    );
    expect(byDomain["body-composition"]).toEqual(
      expect.arrayContaining(["bmi", "body-fat-percent-male", "body-fat-percent-female"]),
    );
  });

  it("every metric has exactly 5 levels with correct labels", () => {
    for (const metric of CLASSIFICATION_REGISTRY) {
      expect(metric.levels).toHaveLength(5);
      const levels = metric.levels.map((l) => l.level);
      expect(levels).toEqual([1, 2, 3, 4, 5]);
    }
  });
});
