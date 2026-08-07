import React from "react";
import renderer, { act } from "react-test-renderer";

import { LabMetricDetailContent } from "@/lib/ui/labs/LabMetricDetailContent";
import type { LabHistoryPointDto, LabMetricDetailResponseDto } from "@/lib/contracts";

const baseDetail: LabMetricDetailResponseDto = {
  ok: true,
  metricKey: "ldl_c",
  displayName: "LDL-C",
  categoryKey: "cardiovascular",
  preferredUnit: "mg/dL",
  referenceRangeText: "0–100 mg/dL",
  latest: {
    schemaVersion: 2,
    id: "r1",
    uploadId: "up1",
    metricKey: "ldl_c",
    displayName: "LDL-C",
    categoryKey: "cardiovascular",
    value: 92,
    unit: "mg/dL",
    flag: "normal",
    collectedAt: "2025-06-01T00:00:00.000Z",
    reportedAt: "2025-06-10T00:00:00.000Z",
    source: "lab_pdf",
    confidence: 0.9,
    rawName: "LDL-C",
    createdAt: "2025-06-10T00:00:00.000Z",
  },
  history: [
    {
      schemaVersion: 2,
      id: "r0",
      uploadId: "up0",
      metricKey: "ldl_c",
      displayName: "LDL-C",
      categoryKey: "cardiovascular",
      value: 88,
      unit: "mg/dL",
      collectedAt: "2024-06-01T00:00:00.000Z",
      reportedAt: "2024-06-10T00:00:00.000Z",
      source: "lab_pdf",
      confidence: 0.9,
      rawName: "LDL-C",
      createdAt: "2024-06-10T00:00:00.000Z",
    },
  ],
};

describe("LabMetricDetailContent", () => {
  it("shows collection date unavailable when collectedAt is missing", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <LabMetricDetailContent
          status="ready"
          data={{
            ...baseDetail,
            latest: {
              ...baseDetail.latest!,
              collectedAt: null,
            },
            history: [],
          }}
        />,
      );
    });
    const texts = tree!.root
      .findAllByType(require("react-native").Text)
      .map((t) => String(t.props.children));
    expect(texts.some((t) => t.includes("Collection date unavailable"))).toBe(true);
    expect(texts.some((t) => t.includes("Jun 10, 2025"))).toBe(false);
  });

  it("does not use createdAt or reportedAt for projection history dates", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <LabMetricDetailContent
          status="ready"
          data={{
            ...baseDetail,
            history: [
              {
                ...baseDetail.history[0]!,
                collectedAt: null,
                reportedAt: "2024-06-10T00:00:00.000Z",
                createdAt: "2024-06-10T00:00:00.000Z",
              },
            ],
          }}
        />,
      );
    });
    const dateNode = tree!.root.findByProps({ testID: "lab-metric-history-date-r0" });
    expect(String(dateNode.props.children)).toBe("Collection date unavailable");
  });

  it("renders neutral change from accepted history", () => {
    const acceptedHistory: LabHistoryPointDto[] = [
      {
        id: "hp2",
        canonicalMetricId: "ldl_c",
        collectedAt: "2025-06-01T00:00:00.000Z",
        result: { kind: "numeric", value: 92, comparator: "eq" },
        displayValue: "92",
        rawUnit: "mg/dL",
        normalizedUnit: "mg/dL",
        rawReferenceRange: null,
        normalizedFlag: "normal",
        sourceDocumentId: "doc2",
        sourcePage: 2,
        methodCompatibility: "compatible",
        trendEligible: true,
        trendEligibility: "numeric_compatible",
        measuredOrCalculated: "measured",
      },
      {
        id: "hp1",
        canonicalMetricId: "ldl_c",
        collectedAt: "2024-06-01T00:00:00.000Z",
        result: { kind: "numeric", value: 88, comparator: "eq" },
        displayValue: "88",
        rawUnit: "mg/dL",
        normalizedUnit: "mg/dL",
        rawReferenceRange: null,
        normalizedFlag: "normal",
        sourceDocumentId: "doc1",
        sourcePage: 1,
        methodCompatibility: "compatible",
        trendEligible: true,
        trendEligibility: "numeric_compatible",
        measuredOrCalculated: "measured",
      },
    ];

    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <LabMetricDetailContent status="ready" data={baseDetail} acceptedHistory={acceptedHistory} />,
      );
    });
    const change = tree!.root.findByProps({ testID: "lab-metric-neutral-change" });
    expect(String(change.props.children)).toMatch(/Increased|4\.5%/);
  });

  it("renders qualitative accepted history in table style", () => {
    const acceptedHistory: LabHistoryPointDto[] = [
      {
        id: "hp_q",
        canonicalMetricId: "hep_b_surface_antigen",
        collectedAt: "2025-06-01T00:00:00.000Z",
        result: { kind: "qualitative", value: "Non-Reactive" },
        displayValue: "Non-Reactive",
        rawUnit: null,
        normalizedUnit: "none",
        rawReferenceRange: null,
        normalizedFlag: null,
        sourceDocumentId: "doc1",
        sourcePage: 3,
        methodCompatibility: "compatible",
        trendEligible: false,
        trendEligibility: "qualitative",
        measuredOrCalculated: "measured",
      },
    ];

    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <LabMetricDetailContent status="ready" data={baseDetail} acceptedHistory={acceptedHistory} />,
      );
    });
    const history = tree!.root.findByProps({ testID: "lab-metric-accepted-history" });
    const text = history
      .findAllByType(require("react-native").Text)
      .map((t) => String(t.props.children))
      .join(" ");
    expect(text).toContain("Non-Reactive");
    expect(text).toContain("Shown in history table only");
    expect(tree!.root.findByProps({ testID: "lab-metric-trend-timeline-note" })).toBeTruthy();
    expect(() => tree!.root.findByProps({ testID: "lab-metric-trend" })).toThrow();
  });

  it("renders numeric trend chart above history and keeps source", () => {
    const acceptedHistory: LabHistoryPointDto[] = [
      {
        id: "hp2",
        canonicalMetricId: "ldl_c",
        collectedAt: "2025-06-01T00:00:00.000Z",
        result: { kind: "numeric", value: 92, comparator: "eq" },
        displayValue: "92",
        rawUnit: "mg/dL",
        normalizedUnit: "mg/dL",
        rawReferenceRange: null,
        normalizedFlag: "normal",
        sourceDocumentId: "doc2",
        sourcePage: 2,
        methodCompatibility: "compatible",
        trendEligible: true,
        trendEligibility: "numeric_compatible",
        measuredOrCalculated: "measured",
      },
      {
        id: "hp1",
        canonicalMetricId: "ldl_c",
        collectedAt: "2024-06-01T00:00:00.000Z",
        result: { kind: "numeric", value: 88, comparator: "eq" },
        displayValue: "88",
        rawUnit: "mg/dL",
        normalizedUnit: "mg/dL",
        rawReferenceRange: null,
        normalizedFlag: "normal",
        sourceDocumentId: "doc1",
        sourcePage: 1,
        methodCompatibility: "compatible",
        trendEligible: true,
        trendEligibility: "numeric_compatible",
        measuredOrCalculated: "measured",
      },
    ];

    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <LabMetricDetailContent status="ready" data={baseDetail} acceptedHistory={acceptedHistory} />,
      );
    });
    expect(tree!.root.findByProps({ testID: "lab-metric-trend" })).toBeTruthy();
    expect(tree!.root.findByProps({ testID: "lab-trend-chart" })).toBeTruthy();
    expect(tree!.root.findByProps({ testID: "lab-metric-accepted-history" })).toBeTruthy();
    expect(tree!.root.findByProps({ testID: "lab-metric-source-label" })).toBeTruthy();
  });

  it("renders single-point trend state", () => {
    const acceptedHistory: LabHistoryPointDto[] = [
      {
        id: "hp1",
        canonicalMetricId: "ldl_c",
        collectedAt: "2025-06-01T00:00:00.000Z",
        result: { kind: "numeric", value: 92, comparator: "eq" },
        displayValue: "92 mg/dL",
        rawUnit: "mg/dL",
        normalizedUnit: "mg/dL",
        rawReferenceRange: null,
        normalizedFlag: null,
        sourceDocumentId: "doc1",
        sourcePage: 1,
        methodCompatibility: "compatible",
        trendEligible: true,
        trendEligibility: "numeric_compatible",
        measuredOrCalculated: "measured",
      },
    ];

    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <LabMetricDetailContent status="ready" data={baseDetail} acceptedHistory={acceptedHistory} />,
      );
    });
    expect(tree!.root.findByProps({ testID: "lab-trend-chart-single" })).toBeTruthy();
  });

  it("renders source reference status in Source section for numeric latest", () => {
    const acceptedHistory: LabHistoryPointDto[] = [
      {
        id: "hp2",
        canonicalMetricId: "ldl_c",
        collectedAt: "2025-06-01T00:00:00.000Z",
        result: { kind: "numeric", value: 92, comparator: "eq" },
        displayValue: "92",
        rawUnit: "mg/dL",
        normalizedUnit: "mg/dL",
        rawReferenceRange: "<100",
        normalizedFlag: "normal",
        laboratoryName: "Quest Diagnostics",
        sourceDocumentId: "doc2",
        sourcePage: 2,
        methodCompatibility: "compatible",
        trendEligible: true,
        trendEligibility: "numeric_compatible",
        measuredOrCalculated: "measured",
      },
    ];

    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <LabMetricDetailContent status="ready" data={baseDetail} acceptedHistory={acceptedHistory} />,
      );
    });
    expect(String(tree!.root.findByProps({ testID: "lab-metric-source-reference-status" }).props.children)).toMatch(
      /Within Quest reference range/,
    );
    expect(String(tree!.root.findByProps({ testID: "lab-metric-source-reference-raw" }).props.children)).toMatch(
      /Quest reference:/i,
    );
    // Primary latest card must not use Quest as the metric standard framing.
    expect(tree!.root.findAllByProps({ testID: "lab-metric-standard-status" })).toHaveLength(0);
  });

  it("renders metric standard framing for Total Cholesterol latest", () => {
    const detail: LabMetricDetailResponseDto = {
      ...baseDetail,
      metricKey: "total_cholesterol",
      displayName: "Total Cholesterol",
      latest: {
        ...baseDetail.latest!,
        metricKey: "total_cholesterol",
        displayName: "Total Cholesterol",
        value: 179,
        rawName: "Cholesterol, Total",
      },
    };
    const acceptedHistory: LabHistoryPointDto[] = [
      {
        id: "tc1",
        canonicalMetricId: "total_cholesterol",
        collectedAt: "2024-10-15T00:00:00.000Z",
        result: { kind: "numeric", value: 179, comparator: "eq" },
        displayValue: "179",
        rawUnit: "mg/dL",
        normalizedUnit: "mg/dL",
        rawReferenceRange: "<200",
        normalizedFlag: "normal",
        laboratoryName: "Quest Diagnostics",
        sourceDocumentId: "d4",
        sourcePage: 1,
        methodCompatibility: "compatible",
        trendEligible: true,
        trendEligibility: "numeric_compatible",
        measuredOrCalculated: "measured",
      },
    ];

    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <LabMetricDetailContent status="ready" data={detail} acceptedHistory={acceptedHistory} />,
      );
    });
    expect(String(tree!.root.findByProps({ testID: "lab-metric-standard-status" }).props.children)).toBe(
      "Within standard",
    );
    expect(String(tree!.root.findByProps({ testID: "lab-metric-standard-label" }).props.children)).toBe(
      "Standard: Under 200 mg/dL",
    );
    const heroTexts = tree!.root
      .findByProps({ testID: "lab-metric-detail" })
      .findAllByType(require("react-native").Text)
      .map((t) => String(t.props.children))
      .join(" | ");
    // Quest framing may still appear under Source, but primary status uses standard language.
    expect(String(tree!.root.findByProps({ testID: "lab-metric-standard-status" }).props.children)).not.toMatch(
      /Quest/i,
    );
    expect(heroTexts).toMatch(/Within standard/);
  });
});
