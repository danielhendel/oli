import {
  BODY_FAT_EDUCATIONAL_REFERENCE_STANDARD,
  BODY_FAT_EDUCATIONAL_REFERENCE_STANDARD_ID,
  BODY_FAT_EDUCATIONAL_REFERENCE_VERSION,
} from "@/lib/body/standards/bodyFatEducationalReferenceStandard";
import {
  LEAN_MASS_EDUCATIONAL_REFERENCE_STANDARD,
  LEAN_MASS_EDUCATIONAL_REFERENCE_STANDARD_ID,
} from "@/lib/body/standards/leanMassEducationalReferenceStandard";
import {
  getBodyMetricEducationalStandard,
  listApprovedPersonalClassificationStandards,
  listBodyMetricEducationalStandards,
  listBodyMetricStandardsRegistry,
} from "@/lib/body/standards/bodyMetricStandardsRegistry";
import {
  classifyBodyCompositionMeasurementMethodKind,
  evaluatePersonalClassificationEligibility,
} from "@/lib/body/standards/methodProvenanceEligibility";
import { resolveBodyMetricEducationalReferencePresentation } from "@/lib/body/standards/resolveEducationalReferencePresentation";
import { resolveBodyMetricStandardPresentation } from "@/lib/body/standards/resolveBodyMetricStandardPresentation";

describe("Stage 3C educational reference standards", () => {
  it("registers Body Fat and Lean Mass educational standards with qualitative ranges only", () => {
    const educational = listBodyMetricEducationalStandards();
    expect(educational.map((s) => s.standardId)).toEqual([
      BODY_FAT_EDUCATIONAL_REFERENCE_STANDARD_ID,
      LEAN_MASS_EDUCATIONAL_REFERENCE_STANDARD_ID,
    ]);
    for (const standard of educational) {
      expect(standard.educationalAuthorization).toBe("approved_for_educational_reference_ui");
      expect(standard.personalClassificationAuthorization).toBe("proposed_human_approval_required");
      expect(standard.educationalRanges.length).toBeGreaterThanOrEqual(2);
      for (const range of standard.educationalRanges) {
        expect(range.numericRangeLabel).toBeNull();
        expect(range.lowerBound).toBeNull();
        expect(range.upperBound).toBeNull();
      }
    }
    expect(
      getBodyMetricEducationalStandard(
        BODY_FAT_EDUCATIONAL_REFERENCE_STANDARD_ID,
        BODY_FAT_EDUCATIONAL_REFERENCE_VERSION,
      ),
    ).not.toBeNull();
  });

  it("keeps Weight as the only approved personal classification standard", () => {
    const approved = listApprovedPersonalClassificationStandards();
    expect(approved).toHaveLength(1);
    expect(approved[0]!.standardId).toBe("cdc-who-adult-bmi-screening");
    const registry = listBodyMetricStandardsRegistry();
    expect(registry.some((e) => e.kind === "educational_reference")).toBe(true);
  });

  it("resolves Body Fat educational graph without personal marker or Gallagher/ACE labels", () => {
    const resolved = resolveBodyMetricEducationalReferencePresentation({
      metric: "bodyFat",
      hasMeasuredValue: true,
      measurementMethod: null,
    });
    expect(resolved).not.toBeNull();
    expect(resolved!.personalMarker).toBeNull();
    expect(resolved!.badgeLabel).toBe("Educational reference");
    expect(resolved!.constructLabel).toMatch(/Body fat/i);
    expect(resolved!.segments.map((s) => s.displayLabel)).toEqual(
      BODY_FAT_EDUCATIONAL_REFERENCE_STANDARD.educationalRanges.map((r) => r.displayLabel),
    );
    expect(resolved!.accessibleSummary).toMatch(/withheld|No personal marker/i);
    expect(resolved!.evidence.evidenceSummary).toMatch(/method|withheld/i);
    expect(resolved!.segments.every((s) => s.numericRangeLabel == null)).toBe(true);
    expect(resolved!.personalPlacementWithheldReasons.join(" ")).toMatch(/not approved|method/i);
    // Personal classification resolver remains fail-closed.
    expect(
      resolveBodyMetricStandardPresentation({
        metric: "bodyFat",
        weightKg: 80,
        bodyFatPercent: 18,
        leanBodyMassKg: null,
        bmi: null,
        heightCm: 180,
        ageYears: 30,
        sex: "male",
        measurementMethod: "apple_health",
        massDisplayUnit: "kg",
      }),
    ).toBeNull();
  });

  it("resolves Lean Mass educational graph without ALMI/EWGSOP2 personal application", () => {
    const resolved = resolveBodyMetricEducationalReferencePresentation({
      metric: "leanTissue",
      hasMeasuredValue: true,
      measurementMethod: "apple_health",
    });
    expect(resolved).not.toBeNull();
    expect(resolved!.personalMarker).toBeNull();
    expect(resolved!.constructLabel).toBe("Total lean mass");
    expect(resolved!.constructDescription).toMatch(/not identical to skeletal muscle/i);
    expect(resolved!.personalPlacementWithheldReasons.join(" ")).toMatch(
      /limb-specific|not currently own|not approved/i,
    );
    expect(resolved!.segments.map((s) => s.displayLabel)).toEqual(
      LEAN_MASS_EDUCATIONAL_REFERENCE_STANDARD.educationalRanges.map((r) => r.displayLabel),
    );
    expect(resolved!.segments.every((s) => s.numericRangeLabel == null)).toBe(true);
  });

  it("does not infer BIA from Apple Health transport", () => {
    expect(classifyBodyCompositionMeasurementMethodKind("apple_health")).toBe(
      "apple_health_transport_unknown_method",
    );
    expect(classifyBodyCompositionMeasurementMethodKind("healthkit")).toBe(
      "apple_health_transport_unknown_method",
    );
    const eligibility = evaluatePersonalClassificationEligibility({
      metric: "bodyFat",
      measurementMethod: "apple_health",
      personalStandardApproved: false,
      constructCompatible: true,
    });
    expect(eligibility.eligible).toBe(false);
    expect(eligibility.reasons.join(" ")).toMatch(/Apple Health is transport/i);
    expect(eligibility.reasons.join(" ")).not.toMatch(/\bBIA\b/);
  });

  it("rejects total-lean → ALMI personal eligibility", () => {
    const eligibility = evaluatePersonalClassificationEligibility({
      metric: "leanTissue",
      measurementMethod: "dxa",
      personalStandardApproved: false,
      constructCompatible: false,
    });
    expect(eligibility.eligible).toBe(false);
    expect(eligibility.reasons.join(" ")).toMatch(/limb-specific|not approved/i);
  });
});
