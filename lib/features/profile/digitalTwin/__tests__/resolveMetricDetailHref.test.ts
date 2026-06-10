// lib/features/profile/digitalTwin/__tests__/resolveMetricDetailHref.test.ts
import {
  metricHasModuleRoute,
  profileMetricFallbackHref,
  resolveMetricDetailHref,
} from "@/lib/features/profile/digitalTwin/resolveMetricDetailHref";

describe("resolveMetricDetailHref", () => {
  it("prefers an explicit module href", () => {
    expect(resolveMetricDetailHref("apob", "/(app)/custom")).toBe("/(app)/custom");
  });

  it("routes every metric to the profile metric detail page", () => {
    expect(resolveMetricDetailHref("apob")).toBe("/(app)/profile/metric/apob");
    expect(resolveMetricDetailHref("tsh")).toBe("/(app)/profile/metric/tsh");
    expect(resolveMetricDetailHref("totally-unknown")).toBe(
      "/(app)/profile/metric/totally-unknown",
    );
  });

  it("encodes the metric id in the fallback href", () => {
    expect(profileMetricFallbackHref("x y")).toBe("/(app)/profile/metric/x%20y");
  });

  it("never returns a /manage/metric route", () => {
    const ids = ["apob", "hrv", "psa", "vitamin-d", "unknown-metric"];
    for (const id of ids) {
      expect(resolveMetricDetailHref(id)).not.toMatch(/\/manage\/metric/);
    }
  });

  it("no metric resolves to a dedicated module route in the scaffold", () => {
    expect(metricHasModuleRoute()).toBe(false);
  });
});
