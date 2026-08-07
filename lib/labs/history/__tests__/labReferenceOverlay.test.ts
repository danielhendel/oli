import { describe, expect, it } from "@jest/globals";

import { buildLabChartDomainWithReference } from "../buildLabChartDomainWithReference";
import {
  buildLabReferenceOverlay,
  formatLabReferenceOverlayCaption,
  labReferenceOverlayThresholds,
} from "../buildLabReferenceOverlay";
import { buildLabTrendAccessibilitySummary } from "../buildLabTrendAccessibilitySummary";
import { buildLabTrendSeries } from "../buildLabTrendSeries";
import { makeNumericHistoryPoint as numericPoint } from "../__fixtures__/labTrendTestFixtures";
import type { LabHistoryPointDto } from "@oli/contracts";

function cholesterolHistory(rawReferenceRange: string | null = "<200") {
  return [
    numericPoint({
      id: "a",
      collectedAt: "2024-10-15T00:00:00.000Z",
      sourceDocumentId: "d4",
      value: 179,
      rawReferenceRange,
    }),
    numericPoint({
      id: "b",
      collectedAt: "2022-07-07T00:00:00.000Z",
      sourceDocumentId: "d3",
      value: 208,
      rawReferenceRange,
    }),
    numericPoint({
      id: "c",
      collectedAt: "2020-09-24T00:00:00.000Z",
      sourceDocumentId: "d2",
      value: 186,
      rawReferenceRange,
    }),
    numericPoint({
      id: "d",
      collectedAt: "2020-06-05T00:00:00.000Z",
      sourceDocumentId: "d1",
      value: 173,
      rawReferenceRange,
    }),
  ];
}

describe("buildLabReferenceOverlay", () => {
  it("builds upper-bound overlay for Total Cholesterol <200 when history is compatible", () => {
    const series = buildLabTrendSeries({
      metricKey: "total_cholesterol",
      displayName: "Total Cholesterol",
      historyPoints: cholesterolHistory("<200"),
    });
    const overlay = buildLabReferenceOverlay({
      graphEligibility: series.graphEligibility,
      points: series.points,
    });
    expect(overlay.kind).toBe("upper_bound");
    if (overlay.kind === "upper_bound") {
      expect(overlay.upper).toBe(200);
      expect(overlay.inclusive).toBe(false);
      expect(overlay.rawReference).toBe("<200");
      expect(overlay.providerName).toMatch(/Quest/i);
      expect(overlay.scope).toBe("persistent");
    }
    expect(labReferenceOverlayThresholds(overlay)).toEqual([200]);
    expect(formatLabReferenceOverlayCaption(overlay, { unit: "mg/dL" })).toBe(
      "Quest reference: <200 mg/dL",
    );
  });

  it("builds lower-bound overlay for HDL-style >=40 references", () => {
    const series = buildLabTrendSeries({
      metricKey: "hdl_c",
      displayName: "HDL-C",
      historyPoints: [
        numericPoint({
          id: "a",
          canonicalMetricId: "hdl_c",
          collectedAt: "2024-10-15T00:00:00.000Z",
          sourceDocumentId: "d2",
          value: 62,
          rawReferenceRange: ">=40",
        }),
        numericPoint({
          id: "b",
          canonicalMetricId: "hdl_c",
          collectedAt: "2022-07-07T00:00:00.000Z",
          sourceDocumentId: "d1",
          value: 55,
          rawReferenceRange: ">=40",
        }),
      ],
    });
    const overlay = buildLabReferenceOverlay({
      graphEligibility: series.graphEligibility,
      points: series.points,
    });
    expect(overlay.kind).toBe("lower_bound");
    if (overlay.kind === "lower_bound") {
      expect(overlay.lower).toBe(40);
      expect(overlay.inclusive).toBe(true);
    }
  });

  it("builds bounded interval overlay for closed ranges", () => {
    const series = buildLabTrendSeries({
      metricKey: "glucose",
      displayName: "Glucose",
      historyPoints: [
        numericPoint({
          id: "a",
          canonicalMetricId: "glucose",
          collectedAt: "2024-10-15T00:00:00.000Z",
          sourceDocumentId: "d2",
          value: 93,
          rawReferenceRange: "70-99",
        }),
        numericPoint({
          id: "b",
          canonicalMetricId: "glucose",
          collectedAt: "2022-07-07T00:00:00.000Z",
          sourceDocumentId: "d1",
          value: 88,
          rawReferenceRange: "70-99",
        }),
      ],
    });
    const overlay = buildLabReferenceOverlay({
      graphEligibility: series.graphEligibility,
      points: series.points,
    });
    expect(overlay.kind).toBe("bounded");
    if (overlay.kind === "bounded") {
      expect(overlay.lower).toBe(70);
      expect(overlay.upper).toBe(99);
      expect(labReferenceOverlayThresholds(overlay)).toEqual([70, 99]);
    }
  });

  it("returns none when reference is missing", () => {
    const series = buildLabTrendSeries({
      metricKey: "total_cholesterol",
      historyPoints: cholesterolHistory(null),
    });
    expect(
      buildLabReferenceOverlay({
        graphEligibility: series.graphEligibility,
        points: series.points,
      }),
    ).toEqual({ kind: "none", reason: "missing_reference" });
  });

  it("treats Reference Range: <200 formatting variants as the same geometry", () => {
    const series = buildLabTrendSeries({
      metricKey: "total_cholesterol",
      displayName: "Total Cholesterol",
      historyPoints: [
        numericPoint({
          id: "a",
          collectedAt: "2024-10-15T00:00:00.000Z",
          sourceDocumentId: "d4",
          value: 179,
          rawReferenceRange: "<200",
        }),
        numericPoint({
          id: "b",
          collectedAt: "2022-07-07T00:00:00.000Z",
          sourceDocumentId: "d3",
          value: 208,
          rawReferenceRange: "Reference Range: <200",
        }),
        numericPoint({
          id: "c",
          collectedAt: "2020-09-24T00:00:00.000Z",
          sourceDocumentId: "d2",
          value: 186,
          rawReferenceRange: "Reference Range: <200",
        }),
        numericPoint({
          id: "d",
          collectedAt: "2020-06-05T00:00:00.000Z",
          sourceDocumentId: "d1",
          value: 173,
          rawReferenceRange: "<200 mg/dL",
        }),
      ],
    });
    const overlay = buildLabReferenceOverlay({
      graphEligibility: series.graphEligibility,
      points: series.points,
    });
    expect(overlay.kind).toBe("upper_bound");
    if (overlay.kind === "upper_bound") {
      expect(overlay.upper).toBe(200);
      expect(overlay.scope).toBe("persistent");
    }
  });

  it("falls back to latest-source band when historical thresholds truly differ", () => {
    const series = buildLabTrendSeries({
      metricKey: "total_cholesterol",
      historyPoints: [
        numericPoint({
          id: "a",
          collectedAt: "2024-10-15T00:00:00.000Z",
          sourceDocumentId: "d2",
          value: 179,
          rawReferenceRange: "<200",
        }),
        numericPoint({
          id: "b",
          collectedAt: "2022-07-07T00:00:00.000Z",
          sourceDocumentId: "d1",
          value: 208,
          rawReferenceRange: "<190",
        }),
      ],
    });
    const overlay = buildLabReferenceOverlay({
      graphEligibility: series.graphEligibility,
      points: series.points,
    });
    expect(overlay.kind).toBe("upper_bound");
    if (overlay.kind === "upper_bound") {
      expect(overlay.upper).toBe(200);
      expect(overlay.scope).toBe("latest");
      expect(formatLabReferenceOverlayCaption(overlay, { unit: "mg/dL" })).toBe(
        "Latest Quest reference: <200 mg/dL",
      );
    }
  });

  it("suppresses persistent band when historical references differ", () => {
    // Kept for compatibility-evaluator coverage; builder uses latest fallback instead of none.
    const series = buildLabTrendSeries({
      metricKey: "total_cholesterol",
      historyPoints: [
        numericPoint({
          id: "a",
          collectedAt: "2024-10-15T00:00:00.000Z",
          sourceDocumentId: "d2",
          value: 179,
          rawReferenceRange: "<200",
        }),
        numericPoint({
          id: "b",
          collectedAt: "2022-07-07T00:00:00.000Z",
          sourceDocumentId: "d1",
          value: 208,
          rawReferenceRange: "<190",
        }),
      ],
    });
    const overlay = buildLabReferenceOverlay({
      graphEligibility: series.graphEligibility,
      points: series.points,
    });
    expect(overlay.kind).not.toBe("none");
    if (overlay.kind !== "none") {
      expect(overlay.scope).toBe("latest");
    }
  });

  it("suppresses band when method or specimen changes across series points", () => {
    // buildLabTrendSeries already drops method/specimen mismatches before charting;
    // overlay still guards if heterogeneous points are supplied.
    const base = {
      canonicalMetricId: "total_cholesterol",
      epochMs: 0,
      displayValue: "179",
      unit: "mg/dL",
      reportFlag: null,
      sourceDocumentId: "d",
      sourcePage: 1,
      panelId: null,
      measuredOrCalculated: "measured" as const,
      laboratoryName: "Quest Diagnostics",
      rawReferenceRange: "<200",
    };

    expect(
      buildLabReferenceOverlay({
        graphEligibility: "numeric_graph",
        points: [
          {
            ...base,
            acceptedResultId: "a",
            collectedDate: "2024-10-15",
            epochMs: 1,
            value: 179,
            methodId: "enzymatic_a",
            specimenType: "serum",
          },
          {
            ...base,
            acceptedResultId: "b",
            collectedDate: "2022-07-07",
            epochMs: 0,
            value: 208,
            methodId: "enzymatic_b",
            specimenType: "serum",
          },
        ],
      }),
    ).toMatchObject({ kind: "upper_bound", scope: "latest", upper: 200 });

    expect(
      buildLabReferenceOverlay({
        graphEligibility: "numeric_graph",
        points: [
          {
            ...base,
            acceptedResultId: "a",
            collectedDate: "2024-10-15",
            epochMs: 1,
            value: 179,
            methodId: null,
            specimenType: "serum",
          },
          {
            ...base,
            acceptedResultId: "b",
            collectedDate: "2022-07-07",
            epochMs: 0,
            value: 208,
            methodId: null,
            specimenType: "plasma",
          },
        ],
      }),
    ).toMatchObject({ kind: "upper_bound", scope: "latest", upper: 200 });
  });

  it("does not invent numeric overlays for qualitative / pattern / inequality timelines", () => {
    const qualitative = buildLabTrendSeries({
      metricKey: "sars_cov2_igg",
      historyPoints: [
        {
          id: "q1",
          canonicalMetricId: "sars_cov2_igg",
          collectedAt: "2021-04-13T00:00:00.000Z",
          sourceCalendarDate: "2021-04-13",
          result: { kind: "qualitative", value: "positive", rawValue: "Positive" },
          rawUnit: null,
          normalizedUnit: null,
          rawReferenceRange: "Negative",
          normalizedFlag: null,
          sourceDocumentId: "d",
          sourcePage: 1,
          methodCompatibility: "compatible",
          trendEligible: false,
          trendEligibility: "qualitative",
        },
      ] as LabHistoryPointDto[],
    });
    expect(
      buildLabReferenceOverlay({
        graphEligibility: qualitative.graphEligibility,
        points: qualitative.points,
      }),
    ).toEqual({ kind: "none", reason: "qualitative" });

    const pattern = buildLabTrendSeries({
      metricKey: "ldl_pattern",
      historyPoints: [
        {
          id: "p1",
          canonicalMetricId: "ldl_pattern",
          collectedAt: "2024-10-15T00:00:00.000Z",
          sourceCalendarDate: "2024-10-15",
          result: { kind: "pattern", value: "Pattern B" },
          rawUnit: null,
          normalizedUnit: null,
          rawReferenceRange: "Pattern A",
          normalizedFlag: null,
          sourceDocumentId: "d",
          sourcePage: 1,
          methodCompatibility: "compatible",
          trendEligible: false,
          trendEligibility: "pattern",
        },
      ] as LabHistoryPointDto[],
    });
    expect(
      buildLabReferenceOverlay({
        graphEligibility: pattern.graphEligibility,
        points: pattern.points,
      }),
    ).toEqual({ kind: "none", reason: "pattern" });

    const inequality = buildLabTrendSeries({
      metricKey: "mercury",
      historyPoints: [
        {
          id: "m1",
          canonicalMetricId: "mercury",
          collectedAt: "2024-10-15T00:00:00.000Z",
          sourceCalendarDate: "2024-10-15",
          result: { kind: "numeric", value: 4, comparator: "lt" },
          rawUnit: "mcg/L",
          normalizedUnit: "mcg/L",
          rawReferenceRange: "<10",
          normalizedFlag: null,
          sourceDocumentId: "d",
          sourcePage: 1,
          methodCompatibility: "compatible",
          trendEligible: false,
          trendEligibility: "inequality_table_only",
        },
      ] as LabHistoryPointDto[],
    });
    expect(
      buildLabReferenceOverlay({
        graphEligibility: inequality.graphEligibility,
        points: inequality.points,
      }),
    ).toEqual({ kind: "none", reason: "inequality_history" });
  });

  it("defers provider category zone fills (text context remains)", () => {
    const series = buildLabTrendSeries({
      metricKey: "ldl_c",
      historyPoints: [
        numericPoint({
          id: "a",
          canonicalMetricId: "ldl_c",
          collectedAt: "2024-10-15T00:00:00.000Z",
          sourceDocumentId: "d2",
          value: 145,
          rawReferenceRange: "Optimal: <100; Moderate: 100-160; High: >160",
        }),
        numericPoint({
          id: "b",
          canonicalMetricId: "ldl_c",
          collectedAt: "2022-07-07T00:00:00.000Z",
          sourceDocumentId: "d1",
          value: 120,
          rawReferenceRange: "Optimal: <100; Moderate: 100-160; High: >160",
        }),
      ],
    });
    expect(
      buildLabReferenceOverlay({
        graphEligibility: series.graphEligibility,
        points: series.points,
      }),
    ).toEqual({ kind: "none", reason: "provider_categories_deferred" });
  });
});

describe("buildLabChartDomainWithReference", () => {
  it("includes upper threshold in y-domain", () => {
    const series = buildLabTrendSeries({
      metricKey: "total_cholesterol",
      historyPoints: cholesterolHistory("<200"),
    });
    const overlay = buildLabReferenceOverlay({
      graphEligibility: series.graphEligibility,
      points: series.points,
    });
    const domain = buildLabChartDomainWithReference(series.points, overlay)!;
    expect(domain.yMin).toBeLessThan(173);
    expect(domain.yMax).toBeGreaterThan(208);
    expect(domain.yMin).toBeLessThan(200);
    expect(domain.yMax).toBeGreaterThan(200);
  });

  it("includes bounded endpoints and keeps flat observed series readable", () => {
    const series = buildLabTrendSeries({
      metricKey: "glucose",
      historyPoints: [
        numericPoint({
          id: "a",
          collectedAt: "2024-10-15T00:00:00.000Z",
          sourceDocumentId: "d2",
          value: 93,
          rawReferenceRange: "70-99",
        }),
        numericPoint({
          id: "b",
          collectedAt: "2022-07-07T00:00:00.000Z",
          sourceDocumentId: "d1",
          value: 93,
          rawReferenceRange: "70-99",
        }),
      ],
    });
    const overlay = buildLabReferenceOverlay({
      graphEligibility: series.graphEligibility,
      points: series.points,
    });
    const domain = buildLabChartDomainWithReference(series.points, overlay)!;
    expect(domain.yMin).toBeLessThan(70);
    expect(domain.yMax).toBeGreaterThan(99);
    // Do not force a zero baseline.
    expect(domain.yMin).toBeGreaterThan(0);
  });

  it("does not exaggerate when overlay is absent", () => {
    const series = buildLabTrendSeries({
      metricKey: "total_cholesterol",
      historyPoints: cholesterolHistory(null),
    });
    const overlay = buildLabReferenceOverlay({
      graphEligibility: series.graphEligibility,
      points: series.points,
    });
    const domain = buildLabChartDomainWithReference(series.points, overlay)!;
    expect(domain.yMax - domain.yMin).toBeLessThan(80);
  });
});

describe("buildLabTrendAccessibilitySummary with reference overlay", () => {
  it("includes source range context without Oli classification words", () => {
    const series = buildLabTrendSeries({
      metricKey: "total_cholesterol",
      displayName: "Total Cholesterol",
      historyPoints: cholesterolHistory("<200"),
    });
    const overlay = buildLabReferenceOverlay({
      graphEligibility: series.graphEligibility,
      points: series.points,
    });
    const label = buildLabTrendAccessibilitySummary(series, { referenceOverlay: overlay });
    expect(label).toContain("Total Cholesterol trend");
    expect(label).toContain("Within Quest reference range");
    expect(label.toLowerCase()).toMatch(/quest reference/);
    expect(label.toLowerCase()).not.toMatch(/\boli\b|healthy|dangerous|optimal for you/);
  });
});
