import {
  buildPhysiqueEstimateModel,
  inferPhysiqueMeasurementSource,
  physiqueMarginForSource,
} from "@/lib/body/physiqueEstimate";

describe("inferPhysiqueMeasurementSource", () => {
  it("detects DEXA source ids", () => {
    expect(inferPhysiqueMeasurementSource(["dexa_scan_clinic"])).toBe("dexa");
  });

  it("treats Apple Health as BIA / smart scale", () => {
    expect(inferPhysiqueMeasurementSource(["apple_health"])).toBe("bia_smart_scale");
    expect(inferPhysiqueMeasurementSource(["healthkit"])).toBe("bia_smart_scale");
  });

  it("treats manual entries as manual estimate", () => {
    expect(inferPhysiqueMeasurementSource(["manual"])).toBe("manual_estimate");
  });

  it("uses unknown for empty or unrecognized sources", () => {
    expect(inferPhysiqueMeasurementSource([])).toBe("unknown");
    expect(inferPhysiqueMeasurementSource(["withings_scale"])).toBe("unknown");
  });
});

describe("physiqueMarginForSource", () => {
  it("uses narrowest margin for DEXA and widest for unknown", () => {
    expect(physiqueMarginForSource("dexa")).toBeLessThan(physiqueMarginForSource("bia_smart_scale"));
    expect(physiqueMarginForSource("bia_smart_scale")).toBeLessThan(
      physiqueMarginForSource("manual_estimate"),
    );
    expect(physiqueMarginForSource("manual_estimate")).toBeLessThan(physiqueMarginForSource("unknown"));
  });
});

describe("buildPhysiqueEstimateModel", () => {
  const base = {
    weightKg: 74.4,
    bodyFatPercent: 22,
    leanBodyMassKg: 58,
    unit: "lb" as const,
  };

  it("returns missing state for weight-only input", () => {
    const m = buildPhysiqueEstimateModel({
      weightKg: 74.4,
      bodyFatPercent: null,
      leanBodyMassKg: null,
      source: "bia_smart_scale",
      unit: "lb",
    });
    expect(m.status).toBe("missing");
    if (m.status === "missing") {
      expect(m.message).toContain("Add body composition data");
    }
  });

  it("returns missing state when weight is absent", () => {
    const m = buildPhysiqueEstimateModel({
      weightKg: null,
      bodyFatPercent: 22,
      leanBodyMassKg: 58,
      source: "bia_smart_scale",
      unit: "lb",
    });
    expect(m.status).toBe("missing");
  });

  it("labels lean mass as Lean Tissue, not Muscle", () => {
    const m = buildPhysiqueEstimateModel({ ...base, source: "bia_smart_scale" });
    expect(m.status).toBe("ready");
    if (m.status === "ready") {
      expect(m.segments.some((s) => s.label === "Lean Tissue")).toBe(true);
      expect(m.segments.some((s) => s.label === "Muscle")).toBe(false);
    }
  });

  it("allows Muscle label when skeletalMuscleMassKg is provided", () => {
    const m = buildPhysiqueEstimateModel({
      ...base,
      leanBodyMassKg: null,
      skeletalMuscleMassKg: 32,
      source: "dexa",
    });
    expect(m.status).toBe("ready");
    if (m.status === "ready") {
      expect(m.segments.some((s) => s.label === "Muscle")).toBe(true);
      expect(m.segments.some((s) => s.label === "Lean Tissue")).toBe(false);
    }
  });

  it("widens BIA ranges more than DEXA for the same center mass", () => {
    const dexa = buildPhysiqueEstimateModel({ ...base, source: "dexa" });
    const bia = buildPhysiqueEstimateModel({ ...base, source: "bia_smart_scale" });
    expect(dexa.status).toBe("ready");
    expect(bia.status).toBe("ready");
    if (dexa.status === "ready" && bia.status === "ready") {
      const dexaFat = dexa.segments.find((s) => s.key === "bodyFat")!;
      const biaFat = bia.segments.find((s) => s.key === "bodyFat")!;
      expect(biaFat.rangeHiKg - biaFat.rangeLoKg).toBeGreaterThan(
        dexaFat.rangeHiKg - dexaFat.rangeLoKg,
      );
    }
  });

  it("uses conservative ranges for unknown source", () => {
    const m = buildPhysiqueEstimateModel({ ...base, source: "unknown" });
    expect(m.status).toBe("ready");
    if (m.status === "ready") {
      const fat = m.segments.find((s) => s.key === "bodyFat")!;
      const spread = fat.rangeHiKg - fat.rangeLoKg;
      const dexa = buildPhysiqueEstimateModel({ ...base, source: "dexa" });
      if (dexa.status === "ready") {
        const dexaFat = dexa.segments.find((s) => s.key === "bodyFat")!;
        expect(spread).toBeGreaterThan(dexaFat.rangeHiKg - dexaFat.rangeLoKg);
      }
    }
  });

  it("includes likely-range copy on segments", () => {
    const m = buildPhysiqueEstimateModel({ ...base, source: "bia_smart_scale" });
    expect(m.status).toBe("ready");
    if (m.status === "ready") {
      for (const seg of m.segments) {
        expect(seg.rangeLabel).toMatch(/^likely /);
      }
    }
  });
});
