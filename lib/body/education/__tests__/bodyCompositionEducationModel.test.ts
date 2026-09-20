import {
  BODY_COMPOSITION_EDUCATION_FORBIDDEN_PERSONALIZATION,
  BODY_COMPOSITION_EDUCATION_MODEL,
  BODY_COMPOSITION_PLAN_HREF,
  deriveBodyCompositionStage3bReadiness,
  getBodyCompositionReferenceFingerprint,
} from "@/lib/body/education/bodyCompositionEducationModel";

describe("BODY_COMPOSITION_EDUCATION_MODEL", () => {
  it("exposes exactly two independent dimensions", () => {
    expect(BODY_COMPOSITION_EDUCATION_MODEL.dimensions).toHaveLength(2);
    expect(BODY_COMPOSITION_EDUCATION_MODEL.dimensions.map((d) => d.id)).toEqual([
      "health_protection",
      "performance_support",
    ]);
    expect(BODY_COMPOSITION_EDUCATION_MODEL.dimensions.map((d) => d.title)).toEqual([
      "Health Protection",
      "Performance Support",
    ]);
  });

  it("does not define a third combined dimension or Body score", () => {
    const serialized = JSON.stringify(BODY_COMPOSITION_EDUCATION_MODEL);
    expect(serialized).not.toMatch(/Body score|combined score|aggregate score/i);
    expect(BODY_COMPOSITION_EDUCATION_MODEL.dimensions.some((d) => d.id.includes("combined"))).toBe(
      false,
    );
  });

  it("has no personal marker, target marker, Optimized, or Excellence personal state", () => {
    const serialized = JSON.stringify(BODY_COMPOSITION_EDUCATION_MODEL);
    for (const token of BODY_COMPOSITION_EDUCATION_FORBIDDEN_PERSONALIZATION) {
      expect(serialized).not.toContain(token);
    }
    expect(serialized).not.toMatch(/You are here|personal marker|target marker/i);
  });

  it("does not place numeric thresholds or BMI target bands on the rails", () => {
    for (const dimension of BODY_COMPOSITION_EDUCATION_MODEL.dimensions) {
      expect(dimension.leftEndpointLabel).not.toMatch(/\d/);
      expect(dimension.rightEndpointLabel).not.toMatch(/\d/);
    }
    const serialized = JSON.stringify(BODY_COMPOSITION_EDUCATION_MODEL.dimensions);
    expect(serialized).not.toMatch(/BMI/);
  });

  it("does not publish a universal body-fat excellence range", () => {
    const bodyFat = BODY_COMPOSITION_EDUCATION_MODEL.markers.find((m) => m.id === "body_fat");
    expect(bodyFat?.whyItMatters).toMatch(/no universal excellent/i);
    expect(JSON.stringify(bodyFat)).not.toMatch(/\d+\s*%/);
  });

  it("locks marker order", () => {
    expect(BODY_COMPOSITION_EDUCATION_MODEL.markers.map((m) => m.id)).toEqual([
      "central_adiposity",
      "body_fat",
      "lean_tissue",
      "visceral_adiposity",
    ]);
  });

  it("locks evidence tier order", () => {
    expect(BODY_COMPOSITION_EDUCATION_MODEL.evidenceTiers.map((t) => t.id)).toEqual([
      "screening",
      "composition",
      "advanced",
    ]);
  });

  it("separates measurements from influences and excludes Oura as a measurement method", () => {
    const influenceIds = BODY_COMPOSITION_EDUCATION_MODEL.influences.map((i) => i.id);
    expect(influenceIds).toEqual([
      "strength",
      "nutrition",
      "cardio_fitness",
      "activity_movement",
      "sleep",
      "recovery",
    ]);
    const serialized = JSON.stringify(BODY_COMPOSITION_EDUCATION_MODEL);
    expect(serialized).not.toMatch(/Oura/);
    expect(BODY_COMPOSITION_EDUCATION_MODEL.measurementTrustPoints.join(" ")).toMatch(
      /transport layer, not a measurement method/i,
    );
    expect(BODY_COMPOSITION_EDUCATION_MODEL.measurementTrustPoints.join(" ")).not.toMatch(/BIA/);
  });

  it("includes Plan boundary copy and a valid Plan href", () => {
    expect(BODY_COMPOSITION_EDUCATION_MODEL.planBoundaryBody).toMatch(/belong in Plan/i);
    expect(BODY_COMPOSITION_EDUCATION_MODEL.planHref).toBe(BODY_COMPOSITION_PLAN_HREF);
    expect(BODY_COMPOSITION_EDUCATION_MODEL.planHref).toContain("/program");
  });

  it("uses only real navigation hrefs for influences and baseline actions", () => {
    for (const influence of BODY_COMPOSITION_EDUCATION_MODEL.influences) {
      expect(influence.href.startsWith("/(app)/")).toBe(true);
    }
    for (const action of BODY_COMPOSITION_EDUCATION_MODEL.baselineActions) {
      if (action.href != null) {
        expect(action.href.startsWith("/(app)/")).toBe(true);
      }
    }
    expect(BODY_COMPOSITION_EDUCATION_MODEL.measurementTrustLearnMoreHref).toContain(
      "body-metric-ranges-explainer",
    );
  });

  it("does not advertise a live DEXA upload action", () => {
    const serialized = JSON.stringify(BODY_COMPOSITION_EDUCATION_MODEL.baselineActions);
    expect(serialized).not.toMatch(/Upload DEXA|dexa/i);
    expect(BODY_COMPOSITION_EDUCATION_MODEL.dexaEducationBody).toMatch(/not available/i);
  });
});

describe("deriveBodyCompositionStage3bReadiness", () => {
  it("returns missing when no measurements exist", () => {
    expect(deriveBodyCompositionStage3bReadiness({ hasAnyExistingBodyMeasurement: false })).toBe(
      "missing",
    );
  });

  it("returns partial when any existing measurement is present", () => {
    expect(deriveBodyCompositionStage3bReadiness({ hasAnyExistingBodyMeasurement: true })).toBe(
      "partial",
    );
  });

  it("never returns ready, stale, or conflicting", () => {
    const values = [
      deriveBodyCompositionStage3bReadiness({ hasAnyExistingBodyMeasurement: false }),
      deriveBodyCompositionStage3bReadiness({ hasAnyExistingBodyMeasurement: true }),
    ];
    for (const value of values) {
      expect(["missing", "partial"]).toContain(value);
    }
  });
});

describe("getBodyCompositionReferenceFingerprint", () => {
  it("is stable for personalization-invariant checks", () => {
    expect(getBodyCompositionReferenceFingerprint()).toBe(getBodyCompositionReferenceFingerprint());
  });
});
