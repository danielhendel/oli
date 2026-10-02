/**
 * Canonical Body Composition Evidence Bridge — focused invariants.
 */
import { describe, expect, it } from "@jest/globals";
import type { BodyScanDetailDto, BodyScanMetricDto, UserProfileMain } from "@oli/contracts";
import { defaultUserProfileMain } from "@oli/contracts";

import { buildBodyCompositionEvidenceBundle } from "../buildBodyCompositionEvidenceBundle";
import { adaptContinuousBodyEvidenceEvent } from "../continuousEvidenceAdapter";
import { adaptVerifiedBodyScanEvidence } from "../bodyScanEvidenceAdapter";
import {
  calculateAlmiObservation,
  calculateBmiObservation,
  calculateFfmiObservation,
  calculateFmiObservation,
  calculateWhtrObservation,
  BODY_COMPOSITION_FORMULA_VERSION,
} from "../formulas";
import { normalizeEvidenceBodyFatPercent } from "../validateEvidence";
import { bodyScanMayContributeToContinuousTrend } from "@/lib/data/body-scans/bodyScanTrendIsolation";

function metric(
  partial: Partial<BodyScanMetricDto> &
    Pick<BodyScanMetricDto, "metricId" | "region" | "value" | "unit">,
): BodyScanMetricDto {
  return { rawLabel: null, corrected: false, ...partial };
}

function verifiedScan(overrides: Partial<BodyScanDetailDto> = {}): BodyScanDetailDto {
  return {
    id: "scan_1",
    scanType: "dxa",
    method: "dxa",
    status: "verified",
    statusLabel: "Measurements saved",
    performedAt: "2026-03-04T00:00:00.000Z",
    uploadedAt: "2026-03-05T12:00:00.000Z",
    deviceLabel: "GE Lunar iDXA",
    adapterLabel: "Live Lean Rx DXA v1.0.0",
    sourceFilename: "Original DXA report",
    metrics: [
      metric({ metricId: "fat_percent", region: "total", value: 21.4, unit: "percent" }),
      metric({ metricId: "lean_mass", region: "total", value: 58.2, unit: "kg" }),
      metric({ metricId: "fat_free_mass", region: "total", value: 60.1, unit: "kg" }),
      metric({ metricId: "total_mass", region: "total", value: 74.0, unit: "kg" }),
      metric({ metricId: "visceral_fat_volume", region: "total", value: 912, unit: "cm3" }),
      metric({ metricId: "lean_mass", region: "right_arm", value: 3.5, unit: "kg" }),
      metric({ metricId: "bone_mineral_density", region: "total", value: 1.186, unit: "g_per_cm2" }),
    ],
    safeWarnings: [],
    canReview: false,
    canRetry: true,
    canDelete: true,
    canViewOriginal: true,
    ...overrides,
  };
}

describe("buildBodyCompositionEvidenceBundle", () => {
  it("preserves multiple same-metric observations from different sources", () => {
    const bundle = buildBodyCompositionEvidenceBundle({
      continuousEvents: [
        {
          rawEventId: "evt_bia",
          kind: "body_composition",
          provider: "apple_health",
          measuredAt: "2026-03-04T08:00:00.000Z",
          payload: { bodyFatPercent: 24.0 },
        },
        {
          rawEventId: "evt_manual",
          kind: "body_composition",
          provider: "manual",
          measuredAt: "2026-03-04T09:00:00.000Z",
          payload: { bodyFatPercent: 23.5 },
        },
      ],
      verifiedBodyScans: [verifiedScan()],
    });
    const bf = bundle.observations.filter((o) => o.metricKey === "fat_percent");
    expect(bf).toHaveLength(3);
    expect(bf.map((o) => o.source.sourceSystem).sort()).toEqual([
      "apple_health",
      "body_scan",
      "manual",
    ]);
    expect(bf.every((o) => o.value === 24 || o.value === 23.5 || o.value === 21.4)).toBe(true);
  });

  it("classifies continuous weight as measured; unlabeled Apple Health composition as unknown+estimated", () => {
    const weight = adaptContinuousBodyEvidenceEvent({
      rawEventId: "w1",
      kind: "weight",
      provider: "apple_health",
      measuredAt: "2026-01-01T12:00:00.000Z",
      payload: { weightKg: 80 },
    });
    const fat = adaptContinuousBodyEvidenceEvent({
      rawEventId: "f1",
      kind: "body_composition",
      provider: "apple_health",
      measuredAt: "2026-01-01T12:00:00.000Z",
      payload: { bodyFatPercent: 0.22 },
    });
    expect(weight.observations[0]?.evidenceType).toBe("measured");
    expect(weight.observations[0]?.source.measurementMethod).toBe("scale_weight");
    expect(weight.observations[0]?.source.sourceSystem).toBe("apple_health");
    expect(fat.observations[0]?.evidenceType).toBe("estimated");
    expect(fat.observations[0]?.value).toBe(22);
    expect(fat.observations[0]?.source.measurementMethod).toBe("unknown");
  });

  it("keeps lean distinct from FFM and never maps to SMM", () => {
    const continuous = adaptContinuousBodyEvidenceEvent({
      rawEventId: "l1",
      kind: "body_composition",
      provider: "apple_health",
      measuredAt: "2026-01-01T12:00:00.000Z",
      payload: { leanBodyMassKg: 55 },
    });
    expect(continuous.observations.map((o) => o.metricKey)).toEqual(["lean_mass"]);
    const scan = adaptVerifiedBodyScanEvidence(verifiedScan());
    expect(scan.observations.some((o) => o.metricKey === "lean_mass")).toBe(true);
    expect(scan.observations.some((o) => o.metricKey === "fat_free_mass")).toBe(true);
    expect(scan.observations.some((o) => o.metricKey === "skeletal_muscle_mass")).toBe(false);
    expect(
      scan.observations.find((o) => o.metricKey === "lean_mass" && o.region === "total")?.value,
    ).not.toBe(
      scan.observations.find((o) => o.metricKey === "fat_free_mass")?.value,
    );
  });

  it("excludes unverified scans and keeps scan evidence trend-ineligible", () => {
    const draft = adaptVerifiedBodyScanEvidence(
      verifiedScan({ status: "needs_review", statusLabel: "Needs review" }),
    );
    expect(draft.observations).toHaveLength(0);
    expect(draft.invalidReasons).toContain("unverified_scan_excluded");

    const verified = adaptVerifiedBodyScanEvidence(verifiedScan());
    expect(verified.observations.length).toBeGreaterThan(0);
    expect(verified.observations.every((o) => o.continuousTrendEligible === false)).toBe(true);
    expect(verified.observations.every((o) => o.source.sourceSystem === "body_scan")).toBe(true);
    expect(bodyScanMayContributeToContinuousTrend()).toBe(false);
  });

  it("preserves regional lean and VAT volume units", () => {
    const scan = adaptVerifiedBodyScanEvidence(verifiedScan());
    const arm = scan.observations.find(
      (o) => o.metricKey === "lean_mass" && o.region === "right_arm",
    );
    const vat = scan.observations.find((o) => o.metricKey === "visceral_fat_volume");
    expect(arm).toBeDefined();
    expect(vat?.canonicalUnit).toBe("cm3");
    expect(vat?.comparabilityGroup).toBe("dxa_vat");
  });

  it("is input-order independent", () => {
    const events = [
      {
        rawEventId: "a",
        kind: "weight" as const,
        provider: "manual",
        measuredAt: "2026-02-01T00:00:00.000Z",
        payload: { weightKg: 70 },
      },
      {
        rawEventId: "b",
        kind: "body_composition" as const,
        provider: "apple_health",
        measuredAt: "2026-02-02T00:00:00.000Z",
        payload: { bodyFatPercent: 20 },
      },
    ];
    const scans = [verifiedScan()];
    const a = buildBodyCompositionEvidenceBundle({
      continuousEvents: events,
      verifiedBodyScans: scans,
    });
    const b = buildBodyCompositionEvidenceBundle({
      continuousEvents: [...events].reverse(),
      verifiedBodyScans: [...scans],
    });
    expect(a.observations.map((o) => o.observationId)).toEqual(
      b.observations.map((o) => o.observationId),
    );
  });

  it("isolates invalid observations without crashing the bundle", () => {
    const bundle = buildBodyCompositionEvidenceBundle({
      continuousEvents: [
        {
          rawEventId: "bad",
          kind: "weight",
          provider: "manual",
          measuredAt: "2026-01-01T00:00:00.000Z",
          payload: { weightKg: Number.NaN },
        },
        {
          rawEventId: "good",
          kind: "weight",
          provider: "manual",
          measuredAt: "2026-01-01T00:00:00.000Z",
          payload: { weightKg: 72 },
        },
      ],
    });
    expect(bundle.observations).toHaveLength(1);
    expect(bundle.diagnostics.invalidCount).toBeGreaterThan(0);
    expect(bundle.diagnostics.reasons).toContain("nan_or_infinite");
  });

  it("exposes subject context without ethnicity and optional waist", () => {
    const profile: UserProfileMain = {
      ...defaultUserProfileMain(),
      identity: {
        ...defaultUserProfileMain().identity,
        sexAtBirth: "female",
        dateOfBirth: "1990-04-12",
      },
      body: { heightCm: 165 },
      bodyInputs: {
        ...defaultUserProfileMain().bodyInputs,
        waistCircumferenceCm: 72,
      },
    };
    const bundle = buildBodyCompositionEvidenceBundle({
      profile,
      profileEffectiveAt: "2026-01-15T00:00:00.000Z",
    });
    expect(bundle.subjectContext.sexAtBirth).toBe("female");
    expect(bundle.subjectContext.height.valueCm).toBe(165);
    expect(bundle.subjectContext.waist.valueCm).toBe(72);
    expect((bundle.subjectContext as { ethnicity?: unknown }).ethnicity).toBeUndefined();
    expect(bundle.observations.some((o) => o.metricKey === "waist_circumference")).toBe(true);
    expect(bundle.observations.some((o) => o.metricKey === "height")).toBe(true);
  });

  it("does not invent waist without an effective timestamp", () => {
    const profile: UserProfileMain = {
      ...defaultUserProfileMain(),
      bodyInputs: {
        ...defaultUserProfileMain().bodyInputs,
        waistCircumferenceCm: 80,
      },
    };
    const bundle = buildBodyCompositionEvidenceBundle({ profile });
    expect(bundle.subjectContext.waist.valueCm).toBe(80);
    expect(bundle.observations.some((o) => o.metricKey === "waist_circumference")).toBe(false);
  });

  it("keeps Total Body BMD non-diagnostic and scan mass separate from continuous weight", () => {
    const bundle = buildBodyCompositionEvidenceBundle({
      continuousEvents: [
        {
          rawEventId: "scale",
          kind: "weight",
          provider: "manual",
          measuredAt: "2026-03-04T00:00:00.000Z",
          payload: { weightKg: 74 },
        },
      ],
      verifiedBodyScans: [verifiedScan()],
    });
    const masses = bundle.observations.filter(
      (o) => o.metricKey === "body_mass" || o.metricKey === "total_mass",
    );
    expect(masses).toHaveLength(2);
    expect(masses.find((o) => o.metricKey === "total_mass")?.continuousTrendEligible).toBe(false);
    expect(masses.find((o) => o.metricKey === "body_mass")?.continuousTrendEligible).toBe(true);
    const bmd = bundle.observations.find((o) => o.metricKey === "bone_mineral_density");
    expect(bmd?.comparabilityGroup).toBe("dxa_bone");
  });
});

describe("evidence percent normalization", () => {
  it("expands fractions once and leaves percent values alone", () => {
    expect(normalizeEvidenceBodyFatPercent(0.177)).toBeCloseTo(17.7);
    expect(normalizeEvidenceBodyFatPercent(17.7)).toBe(17.7);
    expect(normalizeEvidenceBodyFatPercent(101)).toBeNull();
  });
});

describe("formula helpers", () => {
  it("computes BMI/WHtR/FMI/FFMI/ALMI with formula version and input refs", () => {
    const bmi = calculateBmiObservation({
      bodyMassKg: 70,
      heightCm: 175,
      measuredAt: "2026-01-01T00:00:00.000Z",
      inputObservationRefs: ["cont:a:body_mass:total", "profile:height:total"],
    });
    expect(bmi.ok).toBe(true);
    if (bmi.ok) {
      expect(bmi.observation.evidenceType).toBe("calculated");
      expect(bmi.observation.provenance.formulaVersion).toBe(BODY_COMPOSITION_FORMULA_VERSION);
      expect(bmi.observation.provenance.inputObservationRefs).toHaveLength(2);
      expect(bmi.observation.value).toBeCloseTo(22.857, 2);
    }
    expect(
      calculateWhtrObservation({
        waistCm: 70,
        heightCm: 175,
        measuredAt: "2026-01-01T00:00:00.000Z",
        inputObservationRefs: ["w", "h"],
      }).ok,
    ).toBe(true);
    expect(
      calculateFmiObservation({
        fatMassKg: 15,
        heightCm: 175,
        measuredAt: "2026-01-01T00:00:00.000Z",
        inputObservationRefs: ["fm", "h"],
      }).ok,
    ).toBe(true);
    expect(
      calculateFfmiObservation({
        fatFreeMassKg: 55,
        heightCm: 175,
        measuredAt: "2026-01-01T00:00:00.000Z",
        inputObservationRefs: ["ffm", "h"],
      }).ok,
    ).toBe(true);
    expect(
      calculateAlmiObservation({
        appendicularLeanMassKg: 20,
        heightCm: 175,
        measuredAt: "2026-01-01T00:00:00.000Z",
        inputObservationRefs: ["ra", "la", "rl", "ll", "h"],
      }).ok,
    ).toBe(true);
    expect(
      calculateBmiObservation({
        bodyMassKg: 70,
        heightCm: 0,
        measuredAt: "2026-01-01T00:00:00.000Z",
        inputObservationRefs: ["a", "b"],
      }).ok,
    ).toBe(false);
  });
});
