import {
  resolveBodyFatCompositionShareGraph,
  resolveLeanMassCompositionShareGraph,
} from "@/lib/body/presentation/resolveBodyCompositionShareGraph";
import type { BodyCompositionPairingEvidence } from "@/lib/body/presentation/resolveCompatibleBodyCompositionDerivation";

const snapshotEvidence = (
  overrides: Partial<BodyCompositionPairingEvidence> = {},
): BodyCompositionPairingEvidence => ({
  weightKg: 74.3,
  bodyFatPercent: 18.2,
  leanBodyMassKg: 60.8,
  overviewDay: "2026-03-31",
  latestObservedAtIso: "2026-03-31T08:00:00.000Z",
  ...overrides,
});

describe("resolveBodyFatCompositionShareGraph", () => {
  it("places marker at measured percentage and labels percentage view", () => {
    const model = resolveBodyFatCompositionShareGraph({
      evidence: snapshotEvidence({ bodyFatPercent: 18.2, weightKg: 74.3 }),
      view: "percentage",
      massDisplayUnit: "lb",
    });
    expect(model.kind).toBe("composition_share");
    expect(model.personalClassification).toBeNull();
    expect(model.target).toBeNull();
    expect(model.caption).toBe("Share of total mass");
    expect(model.normalizedPosition).toBeCloseTo(0.182, 5);
    expect(model.valueLabel).toBe("18.2%");
    expect(model.accessibleSummary).toMatch(/Share of total mass/i);
    expect(model.accessibleSummary).toMatch(/not a health or performance classification/i);
    expect(model.accessibleSummary).not.toMatch(
      /Essential|Athletic|Fitness|Average|Optimal|Elite|Elevated|High|Obese/i,
    );
  });

  it("mass view keeps the same normalized position with compatible fat mass label", () => {
    // 74.3 kg × 0.182 ≈ 13.52 kg ≈ 29.8 lb
    const pct = resolveBodyFatCompositionShareGraph({
      evidence: snapshotEvidence({ bodyFatPercent: 18.2, weightKg: 74.3 }),
      view: "percentage",
      massDisplayUnit: "lb",
    });
    const mass = resolveBodyFatCompositionShareGraph({
      evidence: snapshotEvidence({ bodyFatPercent: 18.2, weightKg: 74.3 }),
      view: "fatMass",
      massDisplayUnit: "lb",
    });
    expect(mass.normalizedPosition).toBe(pct.normalizedPosition);
    expect(mass.valueLabel).toMatch(/29\.8 lb/);
    expect(mass.accessibleSummary).not.toMatch(/target|classification band/i);
  });

  it("missing percentage yields neutral rail with no marker", () => {
    const model = resolveBodyFatCompositionShareGraph({
      evidence: snapshotEvidence({ bodyFatPercent: null }),
      view: "percentage",
      massDisplayUnit: "lb",
    });
    expect(model.status).toBe("missing");
    expect(model.normalizedPosition).toBeNull();
    expect(model.valueLabel).toBeNull();
    expect(model.accessibleSummary).toMatch(/No personal classification/i);
  });

  it("rejects percentages outside 0–100", () => {
    expect(
      resolveBodyFatCompositionShareGraph({
        evidence: snapshotEvidence({ bodyFatPercent: -1 }),
        view: "percentage",
        massDisplayUnit: "lb",
      }).status,
    ).toBe("error");
    expect(
      resolveBodyFatCompositionShareGraph({
        evidence: snapshotEvidence({ bodyFatPercent: 101 }),
        view: "percentage",
        massDisplayUnit: "lb",
      }).status,
    ).toBe("error");
  });

  it("withholds mass capsule when Weight is incompatible but keeps percentage position", () => {
    const model = resolveBodyFatCompositionShareGraph({
      evidence: {
        weightKg: null,
        bodyFatPercent: 18.2,
        leanBodyMassKg: null,
        overviewDay: null,
      },
      view: "fatMass",
      massDisplayUnit: "lb",
    });
    expect(model.normalizedPosition).toBeCloseTo(0.182, 5);
    expect(model.valueLabel).toBeNull();
    expect(model.accessibleSummary).toMatch(/compatible Weight/i);
  });
});

describe("resolveLeanMassCompositionShareGraph", () => {
  it("uses compatible lean percentage (~81.8%) for position in both views", () => {
    // 60.8 / 74.3 ≈ 81.8%
    const mass = resolveLeanMassCompositionShareGraph({
      evidence: snapshotEvidence({ leanBodyMassKg: 60.8, weightKg: 74.3 }),
      view: "mass",
      massDisplayUnit: "lb",
    });
    const pct = resolveLeanMassCompositionShareGraph({
      evidence: snapshotEvidence({ leanBodyMassKg: 60.8, weightKg: 74.3 }),
      view: "percentage",
      massDisplayUnit: "lb",
    });
    expect(mass.normalizedPosition).toBeCloseTo(0.818, 2);
    expect(pct.normalizedPosition).toBe(mass.normalizedPosition);
    expect(pct.valueLabel).toMatch(/81\.8%/);
    expect(mass.valueLabel).toMatch(/lb/);
    expect(mass.personalClassification).toBeNull();
    expect(mass.target).toBeNull();
    expect(mass.accessibleSummary).toMatch(/not skeletal muscle/i);
    expect(mass.accessibleSummary).not.toMatch(
      /Very Low|Typical|Sarcopenic|Athletic|Optimal|Elite|ALMI|ALM/i,
    );
  });

  it("withholds percentage position when Weight is missing", () => {
    const model = resolveLeanMassCompositionShareGraph({
      evidence: {
        weightKg: null,
        bodyFatPercent: null,
        leanBodyMassKg: 60.8,
        overviewDay: null,
      },
      view: "mass",
      massDisplayUnit: "lb",
    });
    expect(model.normalizedPosition).toBeNull();
    expect(model.valueLabel).toBeNull();
    expect(model.accessibleSummary).toMatch(/compatible Weight/i);
  });

  it("rejects non-positive Weight and out-of-range lean percentage", () => {
    expect(
      resolveLeanMassCompositionShareGraph({
        evidence: snapshotEvidence({ weightKg: 0, leanBodyMassKg: 60 }),
        view: "percentage",
        massDisplayUnit: "lb",
      }).normalizedPosition,
    ).toBeNull();
    expect(
      resolveLeanMassCompositionShareGraph({
        evidence: snapshotEvidence({ weightKg: 50, leanBodyMassKg: 60 }),
        view: "percentage",
        massDisplayUnit: "lb",
      }).status,
    ).toBe("conflicting");
  });
});
