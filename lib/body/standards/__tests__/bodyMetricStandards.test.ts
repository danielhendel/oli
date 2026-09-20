import {
  CDC_WHO_ADULT_BMI_SCREENING_STANDARD,
  CDC_WHO_ADULT_BMI_THRESHOLDS,
  bmiFromWeightAndHeight,
  classifyCdcWhoAdultBmi,
  classifyCdcWhoAdultObesitySubclass,
  formatBmiRangeLabel,
  weightKgForBmiAtHeight,
} from "@/lib/body/standards/cdcWhoAdultBmiScreeningStandard";
import {
  BODY_FAT_GALLAGHER_CANDIDATE_NOTES,
  BODY_FAT_PERCENT_PROPOSED_STANDARD_STUB,
} from "@/lib/body/standards/bodyFatStandardProposal";
import {
  LEAN_TISSUE_EWGSOP2_CANDIDATE_NOTES,
  LEAN_TISSUE_PROPOSED_STANDARD_STUB,
} from "@/lib/body/standards/leanTissueStandardProposal";
import { resolveBodyMetricStandardPresentation } from "@/lib/body/standards/resolveBodyMetricStandardPresentation";

describe("CDC/WHO adult BMI screening standard", () => {
  it("uses exact official classification labels", () => {
    expect(CDC_WHO_ADULT_BMI_SCREENING_STANDARD.classifications.map((c) => c.displayLabel)).toEqual([
      "Underweight",
      "Healthy Weight",
      "Overweight",
      "Obesity",
    ]);
  });

  it("locks exact BMI thresholds", () => {
    expect(CDC_WHO_ADULT_BMI_THRESHOLDS.underweightUpperExclusive).toBe(18.5);
    expect(CDC_WHO_ADULT_BMI_THRESHOLDS.healthyWeightLowerInclusive).toBe(18.5);
    expect(CDC_WHO_ADULT_BMI_THRESHOLDS.healthyWeightUpperExclusive).toBe(25);
    expect(CDC_WHO_ADULT_BMI_THRESHOLDS.overweightLowerInclusive).toBe(25);
    expect(CDC_WHO_ADULT_BMI_THRESHOLDS.overweightUpperExclusive).toBe(30);
    expect(CDC_WHO_ADULT_BMI_THRESHOLDS.obesityLowerInclusive).toBe(30);
    expect(classifyCdcWhoAdultBmi(18.49)).toBe("underweight");
    expect(classifyCdcWhoAdultBmi(18.5)).toBe("healthy_weight");
    expect(classifyCdcWhoAdultBmi(24.9)).toBe("healthy_weight");
    expect(classifyCdcWhoAdultBmi(25)).toBe("overweight");
    expect(classifyCdcWhoAdultBmi(29.9)).toBe("overweight");
    expect(classifyCdcWhoAdultBmi(30)).toBe("obesity");
    expect(classifyCdcWhoAdultObesitySubclass(32)).toBe("obesity_class_1");
    expect(classifyCdcWhoAdultObesitySubclass(37)).toBe("obesity_class_2");
    expect(classifyCdcWhoAdultObesitySubclass(42)).toBe("obesity_class_3");
  });

  it("converts height to weight ranges and does not use Optimal/ideal-weight language", () => {
    const lo = weightKgForBmiAtHeight(18.5, 170);
    const hi = weightKgForBmiAtHeight(24.9, 170);
    expect(lo).not.toBeNull();
    expect(hi).not.toBeNull();
    expect(hi!).toBeGreaterThan(lo!);
    expect(bmiFromWeightAndHeight(70, 170)).toBeCloseTo(24.22, 1);
    expect(formatBmiRangeLabel(18.5, 25)).toBe("BMI 18.5–24.9");
    const serialized = JSON.stringify(CDC_WHO_ADULT_BMI_SCREENING_STANDARD);
    expect(serialized).not.toMatch(/Optimal|ideal weight|Excellence/i);
    expect(CDC_WHO_ADULT_BMI_SCREENING_STANDARD.classificationPurpose).toBe("screening");
  });
});

describe("resolveBodyMetricStandardPresentation — Weight", () => {
  const base = {
    metric: "weight" as const,
    weightKg: 70,
    bodyFatPercent: null,
    leanBodyMassKg: null,
    bmi: 24.2,
    heightCm: 170,
    ageYears: 30,
    sex: "female" as const,
    measurementMethod: "height_and_weight",
    massDisplayUnit: "kg" as const,
  };

  it("places a personal marker only when adult age, height, and BMI resolve", () => {
    const resolved = resolveBodyMetricStandardPresentation(base);
    expect(resolved).not.toBeNull();
    expect(resolved!.markerLabel).toBe("Healthy Weight");
    expect(resolved!.markerPosition).not.toBeNull();
    expect(resolved!.segments.map((s) => s.displayLabel)).toEqual([
      "Underweight",
      "Healthy Weight",
      "Overweight",
      "Obesity",
    ]);
    expect(resolved!.segments.some((s) => s.displayLabel === "Below")).toBe(false);
    expect(resolved!.segments.some((s) => s.displayLabel === "Reference")).toBe(false);
    expect(resolved!.contextLabel).toMatch(/Adult BMI screening/i);
    expect(resolved!.standardId).toBe("cdc-who-adult-bmi-screening");
    expect(resolved!.standardVersion).toBe("2024.1");
    expect(resolved!.markerFormattedValue).toBeTruthy();
    expect(resolved!.withinSegmentPosition).not.toBeNull();
    expect(resolved!.segments.every((s) => s.numericRangeLabel != null)).toBe(true);
    expect(resolved!.accessibleSummary).toMatch(/screening context/i);
    expect(resolved!.accessibleSummary).not.toMatch(/Optimal|Ideal|Target/i);
  });

  it("withholds personal marker when height is missing", () => {
    const resolved = resolveBodyMetricStandardPresentation({ ...base, heightCm: null, bmi: 24.2 });
    expect(resolved).not.toBeNull();
    expect(resolved!.markerPosition).toBeNull();
    expect(resolved!.markerLabel).toBeNull();
    expect(resolved!.segments.every((s) => s.numericRangeLabel == null)).toBe(true);
  });

  it("keeps chart without marker when weight is missing", () => {
    const resolved = resolveBodyMetricStandardPresentation({
      ...base,
      weightKg: null,
      bmi: null,
    });
    expect(resolved).not.toBeNull();
    expect(resolved!.markerPosition).toBeNull();
    expect(resolved!.accessibleSummary).toMatch(/No current measurement/i);
  });

  it("does not apply adult categories under age 20 or with unknown age", () => {
    expect(resolveBodyMetricStandardPresentation({ ...base, ageYears: 19 })).toBeNull();
    expect(resolveBodyMetricStandardPresentation({ ...base, ageYears: null })).toBeNull();
  });
});

describe("resolveBodyMetricStandardPresentation — Body Fat / Lean fail closed", () => {
  const base = {
    weightKg: 80,
    bodyFatPercent: 18,
    leanBodyMassKg: 60,
    bmi: 24,
    heightCm: 180,
    ageYears: 35,
    sex: "male" as const,
    measurementMethod: null as string | null,
    massDisplayUnit: "kg" as const,
  };

  it("fails closed for Body Fat — no segments, no ACE/universal range, no BIA inference", () => {
    expect(BODY_FAT_PERCENT_PROPOSED_STANDARD_STUB.runtimeAuthorization).toBe(
      "proposed_human_approval_required",
    );
    expect(resolveBodyMetricStandardPresentation({ ...base, metric: "bodyFat" })).toBeNull();
    expect(BODY_FAT_GALLAGHER_CANDIDATE_NOTES.incompatibilities.join(" ")).toMatch(/Apple Health/);
    expect(BODY_FAT_GALLAGHER_CANDIDATE_NOTES.incompatibilities.join(" ")).toMatch(/ACE/);
  });

  it("fails closed for Lean Tissue — total lean not treated as ALMI/sarcopenia diagnosis", () => {
    expect(LEAN_TISSUE_PROPOSED_STANDARD_STUB.runtimeAuthorization).toBe(
      "proposed_human_approval_required",
    );
    expect(resolveBodyMetricStandardPresentation({ ...base, metric: "leanTissue" })).toBeNull();
    expect(LEAN_TISSUE_EWGSOP2_CANDIDATE_NOTES.requiredConstruct).toBe("appendicularLeanMassIndex");
    expect(LEAN_TISSUE_EWGSOP2_CANDIDATE_NOTES.limitations.join(" ")).toMatch(/sarcopenia/i);
  });

  it("does not assume a hardcoded four-band graph for unresolved metrics", () => {
    expect(BODY_FAT_PERCENT_PROPOSED_STANDARD_STUB.classifications).toHaveLength(0);
    expect(LEAN_TISSUE_PROPOSED_STANDARD_STUB.classifications).toHaveLength(0);
  });
});
