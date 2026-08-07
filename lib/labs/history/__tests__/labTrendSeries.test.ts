import {
  buildLabTrendSeries,
} from "@/lib/labs/history/buildLabTrendSeries";
import { buildLabChartDomain } from "@/lib/labs/history/buildLabChartDomain";
import { filterLabTrendRange } from "@/lib/labs/history/filterLabTrendRange";
import {
  labTrendCalendarDateFromCollectedAt,
  labTrendEpochMsFromCalendarDate,
} from "@/lib/labs/history/labTrendCalendar";
import {
  mapChartXToEpochMs,
  selectNearestLabTrendPoint,
} from "@/lib/labs/history/selectNearestLabTrendPoint";
import { buildLabTrendAccessibilitySummary } from "@/lib/labs/history/buildLabTrendAccessibilitySummary";
import { makeNumericHistoryPoint as numericPoint } from "@/lib/labs/history/__tests__/labTrendTestFixtures";
import type { LabHistoryPointDto } from "@/lib/contracts";

describe("buildLabTrendSeries", () => {
  it("sorts descending API history to ascending chart order by collectedAt", () => {
    const history = [
      numericPoint({
        id: "a",
        collectedAt: "2024-10-15T00:00:00.000Z",
        sourceDocumentId: "d4",
        value: 179,
      }),
      numericPoint({
        id: "b",
        collectedAt: "2022-07-07T00:00:00.000Z",
        sourceDocumentId: "d3",
        value: 208,
      }),
      numericPoint({
        id: "c",
        collectedAt: "2020-09-24T00:00:00.000Z",
        sourceDocumentId: "d2",
        value: 186,
      }),
      numericPoint({
        id: "d",
        collectedAt: "2020-06-05T00:00:00.000Z",
        sourceDocumentId: "d1",
        value: 173,
      }),
    ];

    const series = buildLabTrendSeries({
      metricKey: "total_cholesterol",
      displayName: "Total Cholesterol",
      historyPoints: history,
    });

    expect(series.graphEligibility).toBe("numeric_graph");
    expect(series.points.map((p) => p.collectedDate)).toEqual([
      "2020-06-05",
      "2020-09-24",
      "2022-07-07",
      "2024-10-15",
    ]);
    expect(series.points.map((p) => p.value)).toEqual([173, 186, 208, 179]);
    expect(series.latest?.value).toBe(179);
    expect(series.prior?.value).toBe(208);
    expect(series.change?.direction).toBe("decreased");
    expect(series.change?.interpretation).toBeNull();
  });

  it("ignores upload order — collectedAt controls ordering", () => {
    // Simulate reports uploaded 2024, 2020, 2022, 2021 (ids reflect upload order).
    const history = [
      numericPoint({
        id: "upload-1",
        collectedAt: "2024-10-15T00:00:00.000Z",
        sourceDocumentId: "doc-2024",
        value: 179,
      }),
      numericPoint({
        id: "upload-2",
        collectedAt: "2020-06-05T00:00:00.000Z",
        sourceDocumentId: "doc-2020",
        value: 173,
      }),
      numericPoint({
        id: "upload-3",
        collectedAt: "2022-07-07T00:00:00.000Z",
        sourceDocumentId: "doc-2022",
        value: 208,
      }),
      numericPoint({
        id: "upload-4",
        collectedAt: "2021-04-13T00:00:00.000Z",
        sourceDocumentId: "doc-2021",
        value: 190,
      }),
    ];
    const series = buildLabTrendSeries({
      metricKey: "total_cholesterol",
      historyPoints: history,
    });
    expect(series.points.map((p) => p.collectedDate)).toEqual([
      "2020-06-05",
      "2021-04-13",
      "2022-07-07",
      "2024-10-15",
    ]);
  });

  it("removes duplicate source representations", () => {
    const history = [
      numericPoint({
        id: "dup-a",
        acceptedResultId: "dup-a",
        collectedAt: "2024-10-15T00:00:00.000Z",
        sourceDocumentId: "same-doc",
        value: 179,
      }),
      numericPoint({
        id: "dup-a",
        acceptedResultId: "dup-a",
        collectedAt: "2024-10-15T00:00:00.000Z",
        sourceDocumentId: "same-doc",
        value: 179,
      }),
      numericPoint({
        id: "other",
        collectedAt: "2022-07-07T00:00:00.000Z",
        sourceDocumentId: "other-doc",
        value: 208,
      }),
    ];
    const series = buildLabTrendSeries({
      metricKey: "total_cholesterol",
      historyPoints: history,
    });
    expect(series.points).toHaveLength(2);
  });

  it("excludes threshold/reference-like and non-eq rows via eligibility", () => {
    const history = [
      numericPoint({
        id: "keep",
        collectedAt: "2024-10-15T00:00:00.000Z",
        sourceDocumentId: "d1",
        value: 179,
      }),
      {
        ...numericPoint({
          id: "ref",
          collectedAt: "2022-07-07T00:00:00.000Z",
          sourceDocumentId: "d2",
          value: 200,
        }),
        trendEligible: false,
        trendEligibility: "table_only",
      },
      {
        ...numericPoint({
          id: "ineq",
          collectedAt: "2020-06-05T00:00:00.000Z",
          sourceDocumentId: "d3",
          value: 4,
        }),
        result: { kind: "numeric", value: 4, comparator: "lt" },
        trendEligible: false,
        trendEligibility: "inequality_table_only",
      },
    ] as LabHistoryPointDto[];

    const series = buildLabTrendSeries({
      metricKey: "total_cholesterol",
      historyPoints: history,
    });
    expect(series.points).toHaveLength(1);
    expect(series.graphEligibility).toBe("single_numeric_point");
  });

  it("does not mutate source values", () => {
    const history = [
      numericPoint({
        id: "a",
        collectedAt: "2024-10-15T00:00:00.000Z",
        sourceDocumentId: "d1",
        value: 179,
      }),
      numericPoint({
        id: "b",
        collectedAt: "2022-07-07T00:00:00.000Z",
        sourceDocumentId: "d2",
        value: 208,
      }),
    ];
    const before = JSON.stringify(history);
    buildLabTrendSeries({ metricKey: "total_cholesterol", historyPoints: history });
    expect(JSON.stringify(history)).toBe(before);
  });
});

describe("lab trend temporal spacing", () => {
  it("uses collection dates with real elapsed spacing domain", () => {
    const history = [
      numericPoint({
        id: "a",
        collectedAt: "2024-10-15T00:00:00.000Z",
        sourceDocumentId: "d4",
        value: 179,
      }),
      numericPoint({
        id: "b",
        collectedAt: "2022-07-07T00:00:00.000Z",
        sourceDocumentId: "d3",
        value: 208,
      }),
      numericPoint({
        id: "c",
        collectedAt: "2020-09-24T00:00:00.000Z",
        sourceDocumentId: "d2",
        value: 186,
      }),
      numericPoint({
        id: "d",
        collectedAt: "2020-06-05T00:00:00.000Z",
        sourceDocumentId: "d1",
        value: 173,
      }),
    ];
    const series = buildLabTrendSeries({
      metricKey: "total_cholesterol",
      historyPoints: history,
    });
    const domain = buildLabChartDomain(series.points);
    expect(domain).not.toBeNull();

    const jun = series.points[0]!.epochMs!;
    const sep = series.points[1]!.epochMs!;
    const jul = series.points[2]!.epochMs!;
    const oct = series.points[3]!.epochMs!;

    // Sep 2020 is much closer to Jun 2020 than Jul 2022 is to Sep 2020.
    expect(sep - jun).toBeLessThan(jul - sep);
    expect(jul - sep).toBeLessThan(oct - jul);
    expect(domain!.xMinMs).toBe(jun);
    expect(domain!.xMaxMs).toBe(oct);
  });

  it("date-only 2020-06-05 never shifts to June 4", () => {
    const calendar = labTrendCalendarDateFromCollectedAt("2020-06-05T00:00:00.000Z");
    expect(calendar).toBe("2020-06-05");
    const epoch = labTrendEpochMsFromCalendarDate(calendar!);
    expect(epoch).toBe(Date.UTC(2020, 5, 5));
    const asUtc = new Date(epoch!);
    expect(asUtc.getUTCFullYear()).toBe(2020);
    expect(asUtc.getUTCMonth()).toBe(5);
    expect(asUtc.getUTCDate()).toBe(5);
  });

  it("prefers sourceCalendarDate over timezone-bearing collectedAt prefix", () => {
    const calendar = labTrendCalendarDateFromCollectedAt(
      "2020-06-05T04:00:00.000Z",
      "2020-06-05",
    );
    expect(calendar).toBe("2020-06-05");
  });
});

describe("lab trend eligibility presentation", () => {
  it("numeric equality history → numeric_graph", () => {
    const series = buildLabTrendSeries({
      metricKey: "wbc",
      historyPoints: [
        numericPoint({
          id: "1",
          canonicalMetricId: "wbc",
          collectedAt: "2024-10-15T00:00:00.000Z",
          sourceDocumentId: "a",
          value: 6.2,
          normalizedUnit: "x10E3/uL",
          rawUnit: "x10E3/uL",
        }),
        numericPoint({
          id: "2",
          canonicalMetricId: "wbc",
          collectedAt: "2022-07-07T00:00:00.000Z",
          sourceDocumentId: "b",
          value: 5.8,
          normalizedUnit: "x10E3/uL",
          rawUnit: "x10E3/uL",
        }),
      ],
    });
    expect(series.graphEligibility).toBe("numeric_graph");
  });

  it("single numeric point → single_numeric_point", () => {
    const series = buildLabTrendSeries({
      metricKey: "apo_b",
      historyPoints: [
        numericPoint({
          id: "1",
          collectedAt: "2024-10-15T00:00:00.000Z",
          sourceDocumentId: "a",
          value: 92,
        }),
      ],
    });
    expect(series.graphEligibility).toBe("single_numeric_point");
  });

  it("qualitative → qualitative_timeline", () => {
    const series = buildLabTrendSeries({
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
          rawReferenceRange: null,
          normalizedFlag: null,
          sourceDocumentId: "d",
          sourcePage: 1,
          methodCompatibility: "compatible",
          trendEligible: false,
          trendEligibility: "qualitative",
        },
      ] as LabHistoryPointDto[],
    });
    expect(series.graphEligibility).toBe("qualitative_timeline");
    expect(series.points).toHaveLength(0);
  });

  it("pattern → pattern_timeline", () => {
    const series = buildLabTrendSeries({
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
          rawReferenceRange: null,
          normalizedFlag: null,
          sourceDocumentId: "d",
          sourcePage: 1,
          methodCompatibility: "compatible",
          trendEligible: false,
          trendEligibility: "pattern",
        },
      ] as LabHistoryPointDto[],
    });
    expect(series.graphEligibility).toBe("pattern_timeline");
  });

  it("inequality → inequality_timeline and never coerces value", () => {
    const series = buildLabTrendSeries({
      metricKey: "mercury",
      historyPoints: [
        {
          id: "m1",
          canonicalMetricId: "mercury",
          collectedAt: "2024-10-15T00:00:00.000Z",
          sourceCalendarDate: "2024-10-15",
          result: { kind: "numeric", value: 4, comparator: "lt" },
          displayValue: "<4 mcg/L",
          rawUnit: "mcg/L",
          normalizedUnit: "mcg/L",
          rawReferenceRange: null,
          normalizedFlag: null,
          sourceDocumentId: "d",
          sourcePage: 1,
          methodCompatibility: "compatible",
          trendEligible: false,
          trendEligibility: "inequality_table_only",
        },
      ] as LabHistoryPointDto[],
    });
    expect(series.graphEligibility).toBe("inequality_timeline");
    expect(series.points).toHaveLength(0);
    expect(series.change).toBeNull();
  });

  it("incompatible unit → incompatible_history or excluded from combined graph", () => {
    const series = buildLabTrendSeries({
      metricKey: "ldl_c",
      historyPoints: [
        numericPoint({
          id: "1",
          collectedAt: "2024-10-15T00:00:00.000Z",
          sourceDocumentId: "a",
          value: 92,
          normalizedUnit: "mg/dL",
        }),
        {
          ...numericPoint({
            id: "2",
            collectedAt: "2022-07-07T00:00:00.000Z",
            sourceDocumentId: "b",
            value: 2.4,
            normalizedUnit: "mmol/L",
            rawUnit: "mmol/L",
          }),
          trendEligible: false,
          trendEligibility: "incompatible_unit",
        },
      ],
    });
    // Second point excluded; only one compatible numeric remains.
    expect(series.points).toHaveLength(1);
    expect(series.graphEligibility).toBe("single_numeric_point");
  });

  it("incompatible specimen does not merge into one graph", () => {
    const series = buildLabTrendSeries({
      metricKey: "glucose",
      historyPoints: [
        numericPoint({
          id: "1",
          collectedAt: "2024-10-15T00:00:00.000Z",
          sourceDocumentId: "a",
          value: 95,
          specimenType: "serum",
        }),
        numericPoint({
          id: "2",
          collectedAt: "2022-07-07T00:00:00.000Z",
          sourceDocumentId: "b",
          value: 102,
          specimenType: "plasma",
        }),
      ],
    });
    expect(series.points).toHaveLength(1);
    expect(series.latest?.specimenType).toBe("serum");
  });
});

describe("selectNearestLabTrendPoint", () => {
  it("snaps to nearest real point without interpolation", () => {
    const series = buildLabTrendSeries({
      metricKey: "total_cholesterol",
      historyPoints: [
        numericPoint({
          id: "a",
          collectedAt: "2024-10-15T00:00:00.000Z",
          sourceDocumentId: "d4",
          value: 179,
        }),
        numericPoint({
          id: "b",
          collectedAt: "2022-07-07T00:00:00.000Z",
          sourceDocumentId: "d3",
          value: 208,
        }),
        numericPoint({
          id: "c",
          collectedAt: "2020-06-05T00:00:00.000Z",
          sourceDocumentId: "d1",
          value: 173,
        }),
      ],
    });
    const domain = buildLabChartDomain(series.points)!;
    // Touch near the middle of 2022–2024 span → prefer 2022 or 2024 nearest.
    const target = mapChartXToEpochMs({
      locationX: 50,
      plotLeft: 0,
      plotWidth: 100,
      xMinMs: domain.xMinMs,
      xMaxMs: domain.xMaxMs,
    })!;
    const nearest = selectNearestLabTrendPoint({
      points: series.points,
      targetEpochMs: target,
    });
    expect(nearest).not.toBeNull();
    expect([173, 208, 179]).toContain(nearest!.value);
    // Exactly at 2022 point epoch.
    const exact = selectNearestLabTrendPoint({
      points: series.points,
      targetEpochMs: series.points[1]!.epochMs!,
    });
    expect(exact?.collectedDate).toBe("2022-07-07");
    expect(exact?.value).toBe(208);
  });
});

describe("filterLabTrendRange", () => {
  it("filters by collectedAt only", () => {
    const series = buildLabTrendSeries({
      metricKey: "total_cholesterol",
      historyPoints: [
        numericPoint({
          id: "a",
          collectedAt: "2024-10-15T00:00:00.000Z",
          sourceDocumentId: "d4",
          value: 179,
        }),
        numericPoint({
          id: "b",
          collectedAt: "2022-07-07T00:00:00.000Z",
          sourceDocumentId: "d3",
          value: 208,
        }),
        numericPoint({
          id: "c",
          collectedAt: "2020-06-05T00:00:00.000Z",
          sourceDocumentId: "d1",
          value: 173,
        }),
      ],
    });
    expect(filterLabTrendRange(series.points, "all")).toHaveLength(3);
    const oneY = filterLabTrendRange(series.points, "1y");
    expect(oneY.every((p) => p.collectedDate >= "2023-10-15")).toBe(true);
    expect(oneY.map((p) => p.collectedDate)).toEqual(["2024-10-15"]);
  });
});

describe("buildLabChartDomain", () => {
  it("pads observed values and keeps flat series readable", () => {
    const series = buildLabTrendSeries({
      metricKey: "x",
      historyPoints: [
        numericPoint({
          id: "a",
          collectedAt: "2024-10-15T00:00:00.000Z",
          sourceDocumentId: "d1",
          value: 100,
        }),
        numericPoint({
          id: "b",
          collectedAt: "2022-07-07T00:00:00.000Z",
          sourceDocumentId: "d2",
          value: 100,
        }),
      ],
    });
    const domain = buildLabChartDomain(series.points)!;
    expect(domain.flat).toBe(true);
    expect(domain.yMin).toBeLessThan(100);
    expect(domain.yMax).toBeGreaterThan(100);
  });
});

describe("buildLabTrendAccessibilitySummary", () => {
  it("summarizes numeric trend without listing every coordinate", () => {
    const series = buildLabTrendSeries({
      metricKey: "total_cholesterol",
      displayName: "Total Cholesterol",
      historyPoints: [
        numericPoint({
          id: "a",
          collectedAt: "2024-10-15T00:00:00.000Z",
          sourceDocumentId: "d4",
          value: 179,
        }),
        numericPoint({
          id: "b",
          collectedAt: "2022-07-07T00:00:00.000Z",
          sourceDocumentId: "d3",
          value: 208,
        }),
        numericPoint({
          id: "c",
          collectedAt: "2020-09-24T00:00:00.000Z",
          sourceDocumentId: "d2",
          value: 186,
        }),
        numericPoint({
          id: "d",
          collectedAt: "2020-06-05T00:00:00.000Z",
          sourceDocumentId: "d1",
          value: 173,
        }),
      ],
    });
    const label = buildLabTrendAccessibilitySummary(series);
    expect(label).toContain("Total Cholesterol trend");
    expect(label).toContain("4 results");
    expect(label).toContain("Jun 5, 2020");
    expect(label).toContain("Oct 15, 2024");
    expect(label).toContain("179");
    expect(label).toContain("milligrams per deciliter");
  });
});
