/**
 * Apple Health method taxonomy + evidence completeness contracts.
 */
import { describe, expect, it } from "@jest/globals";
import { defaultUserProfileMain } from "@oli/contracts";

import {
  buildBodyCompositionEvidenceBundle,
  buildEvidenceCompleteness,
  sourceArrayPresence,
} from "../buildBodyCompositionEvidenceBundle";
import { adaptContinuousBodyEvidenceEvent } from "../continuousEvidenceAdapter";
import {
  continuousEvidenceTypeForMetric,
  resolveContinuousMeasurementMethod,
} from "../sourceTaxonomy";

describe("resolveContinuousMeasurementMethod — Apple Health transport", () => {
  it("does not infer consumer_bia for unlabeled Apple Health composition", () => {
    expect(
      resolveContinuousMeasurementMethod({
        sourceSystem: "apple_health",
        metric: "fat_percent",
      }),
    ).toBe("unknown");
    expect(
      resolveContinuousMeasurementMethod({
        sourceSystem: "apple_health",
        metric: "lean_mass",
      }),
    ).toBe("unknown");
    expect(
      continuousEvidenceTypeForMetric({ metric: "fat_percent", method: "unknown" }),
    ).toBe("estimated");
    expect(
      continuousEvidenceTypeForMetric({ metric: "lean_mass", method: "unknown" }),
    ).toBe("estimated");
  });

  it("preserves explicit methods for Apple Health composition", () => {
    expect(
      resolveContinuousMeasurementMethod({
        sourceSystem: "apple_health",
        metric: "fat_percent",
        explicitMethod: "consumer_bia",
      }),
    ).toBe("consumer_bia");
    expect(
      resolveContinuousMeasurementMethod({
        sourceSystem: "apple_health",
        metric: "lean_mass",
        explicitMethod: "segmental_bia",
      }),
    ).toBe("segmental_bia");
    expect(
      resolveContinuousMeasurementMethod({
        sourceSystem: "apple_health",
        metric: "fat_percent",
        explicitMethod: "dxa",
      }),
    ).toBe("dxa");
    expect(
      resolveContinuousMeasurementMethod({
        sourceSystem: "apple_health",
        metric: "fat_percent",
        explicitMethod: "unknown",
      }),
    ).toBe("unknown");
  });

  it("keeps Withings composition as a separate consumer_bia branch", () => {
    expect(
      resolveContinuousMeasurementMethod({
        sourceSystem: "withings",
        metric: "fat_percent",
      }),
    ).toBe("consumer_bia");
    expect(
      resolveContinuousMeasurementMethod({
        sourceSystem: "withings",
        metric: "lean_mass",
      }),
    ).toBe("consumer_bia");
  });

  it("preserves body_scan dxa and manual weight semantics", () => {
    expect(
      resolveContinuousMeasurementMethod({
        sourceSystem: "body_scan",
        metric: "fat_percent",
      }),
    ).toBe("dxa");
    expect(
      resolveContinuousMeasurementMethod({
        sourceSystem: "manual",
        metric: "body_mass",
      }),
    ).toBe("scale_weight");
    expect(
      resolveContinuousMeasurementMethod({
        sourceSystem: "apple_health",
        metric: "body_mass",
      }),
    ).toBe("scale_weight");
  });
});

describe("adaptContinuousBodyEvidenceEvent — AH unlabeled composition", () => {
  it("emits unknown method + estimated for AH fat and lean without metadata", () => {
    const fat = adaptContinuousBodyEvidenceEvent({
      rawEventId: "ah_bf",
      kind: "body_composition",
      provider: "apple_health",
      measuredAt: "2026-01-01T00:00:00.000Z",
      payload: { bodyFatPercent: 20 },
    });
    const lean = adaptContinuousBodyEvidenceEvent({
      rawEventId: "ah_lean",
      kind: "body_composition",
      provider: "apple_health",
      measuredAt: "2026-01-01T00:00:00.000Z",
      payload: { leanBodyMassKg: 50 },
    });
    expect(fat.observations[0]?.source.measurementMethod).toBe("unknown");
    expect(fat.observations[0]?.evidenceType).toBe("estimated");
    expect(lean.observations[0]?.source.measurementMethod).toBe("unknown");
    expect(lean.observations[0]?.evidenceType).toBe("estimated");
  });

  it("preserves explicit consumer_bia on Apple Health when labeled", () => {
    const fat = adaptContinuousBodyEvidenceEvent({
      rawEventId: "ah_labeled",
      kind: "body_composition",
      provider: "apple_health",
      measuredAt: "2026-01-01T00:00:00.000Z",
      payload: { bodyFatPercent: 21 },
      measurementMethodLabel: "consumer_bia",
    });
    expect(fat.observations[0]?.source.measurementMethod).toBe("consumer_bia");
    expect(fat.observations[0]?.evidenceType).toBe("estimated");
  });
});

describe("adaptContinuousBodyEvidenceEvent — waist", () => {
  it("maps dated manual waist with WHO protocol provenance", () => {
    const result = adaptContinuousBodyEvidenceEvent({
      rawEventId: "waist_1",
      kind: "body_composition",
      provider: "manual",
      sourceId: "manual",
      measuredAt: "2026-03-04T08:00:00.000Z",
      payload: {
        waistCircumferenceCm: 82.5,
        protocolId: "who_midpoint_v1",
        protocolVersion: 1,
      },
    });
    expect(result.observations).toHaveLength(1);
    const obs = result.observations[0]!;
    expect(obs.metricKey).toBe("waist_circumference");
    expect(obs.value).toBe(82.5);
    expect(obs.canonicalUnit).toBe("cm");
    expect(obs.source.measurementMethod).toBe("manual_anthropometry");
    expect(obs.provenance.protocolId).toBe("who_midpoint_v1");
    expect(obs.provenance.protocolVersion).toBe(1);
    expect(obs.continuousTrendEligible).toBe(true);
  });
});

describe("evidence completeness contract", () => {
  it("distinguishes omitted vs empty vs nonempty", () => {
    expect(sourceArrayPresence(undefined)).toBe("omitted");
    expect(sourceArrayPresence([])).toBe("provided_empty");
    expect(sourceArrayPresence([{ id: 1 }])).toBe("provided_nonempty");
  });

  it("marks profile-only caller inputs as omitted continuous/scans", () => {
    const bundle = buildBodyCompositionEvidenceBundle({
      profile: defaultUserProfileMain(),
    });
    expect(bundle.completeness).toEqual({
      mode: "caller_supplied_partial",
      profile: "available",
      continuousEvents: "omitted",
      verifiedScanDetails: "omitted",
    });
  });

  it("records explicit empty arrays as provided_empty", () => {
    const bundle = buildBodyCompositionEvidenceBundle({
      profile: defaultUserProfileMain(),
      continuousEvents: [],
      verifiedBodyScans: [],
    });
    expect(bundle.completeness.continuousEvents).toBe("provided_empty");
    expect(bundle.completeness.verifiedScanDetails).toBe("provided_empty");
    expect(bundle.completeness.mode).toBe("caller_supplied_partial");
  });

  it("records continuous-only and scans-only presence without account-complete claim", () => {
    const continuousOnly = buildBodyCompositionEvidenceBundle({
      continuousEvents: [
        {
          rawEventId: "w",
          kind: "weight",
          provider: "manual",
          measuredAt: "2026-01-01T00:00:00.000Z",
          payload: { weightKg: 70 },
        },
      ],
    });
    expect(continuousOnly.completeness.continuousEvents).toBe("provided_nonempty");
    expect(continuousOnly.completeness.verifiedScanDetails).toBe("omitted");
    expect(continuousOnly.completeness.mode).toBe("caller_supplied_partial");

    const scansOnly = buildBodyCompositionEvidenceBundle({
      verifiedBodyScans: [
        {
          id: "scan_1",
          scanType: "dxa",
          method: "dxa",
          status: "verified",
          statusLabel: "ok",
          performedAt: "2026-01-01T00:00:00.000Z",
          uploadedAt: "2026-01-02T00:00:00.000Z",
          deviceLabel: null,
          adapterLabel: null,
          sourceFilename: "Original DXA report",
          metrics: [
            {
              metricId: "fat_percent",
              region: "total",
              value: 20,
              unit: "percent",
              rawLabel: null,
              corrected: false,
            },
          ],
          safeWarnings: [],
          canReview: false,
          canRetry: false,
          canDelete: true,
          canViewOriginal: true,
        },
      ],
    });
    expect(scansOnly.completeness.continuousEvents).toBe("omitted");
    expect(scansOnly.completeness.verifiedScanDetails).toBe("provided_nonempty");
    expect(scansOnly.completeness.mode).toBe("caller_supplied_partial");
  });

  it("keeps mode caller_supplied_partial even when both arrays are nonempty", () => {
    const completeness = buildEvidenceCompleteness({
      profile: defaultUserProfileMain(),
      continuousEvents: [{ a: 1 }],
      verifiedBodyScans: [{ b: 2 }, { c: 3 }],
    });
    expect(completeness.mode).toBe("caller_supplied_partial");
    expect(completeness.continuousEvents).toBe("provided_nonempty");
    expect(completeness.verifiedScanDetails).toBe("provided_nonempty");
    expect(JSON.stringify(completeness).toLowerCase()).not.toContain("account_complete");
  });

  it("preserves multi-source methods after AH correction", () => {
    const bundle = buildBodyCompositionEvidenceBundle({
      continuousEvents: [
        {
          rawEventId: "ah",
          kind: "body_composition",
          provider: "apple_health",
          measuredAt: "2026-03-04T08:00:00.000Z",
          payload: { bodyFatPercent: 24 },
        },
        {
          rawEventId: "wt",
          kind: "body_composition",
          provider: "withings",
          measuredAt: "2026-03-04T08:30:00.000Z",
          payload: { bodyFatPercent: 23 },
        },
      ],
      verifiedBodyScans: [
        {
          id: "scan_dxa",
          scanType: "dxa",
          method: "dxa",
          status: "verified",
          statusLabel: "ok",
          performedAt: "2026-03-04T00:00:00.000Z",
          uploadedAt: "2026-03-05T00:00:00.000Z",
          deviceLabel: "GE Lunar",
          adapterLabel: null,
          sourceFilename: "Original DXA report",
          metrics: [
            {
              metricId: "fat_percent",
              region: "total",
              value: 21.4,
              unit: "percent",
              rawLabel: null,
              corrected: false,
            },
          ],
          safeWarnings: [],
          canReview: false,
          canRetry: false,
          canDelete: true,
          canViewOriginal: true,
        },
      ],
    });
    const bf = bundle.observations.filter((o) => o.metricKey === "fat_percent");
    expect(bf).toHaveLength(3);
    expect(bf.find((o) => o.source.sourceSystem === "apple_health")?.source.measurementMethod).toBe(
      "unknown",
    );
    expect(bf.find((o) => o.source.sourceSystem === "withings")?.source.measurementMethod).toBe(
      "consumer_bia",
    );
    expect(bf.find((o) => o.source.sourceSystem === "body_scan")?.source.measurementMethod).toBe(
      "dxa",
    );
    expect(bundle.completeness.mode).toBe("caller_supplied_partial");
  });
});
