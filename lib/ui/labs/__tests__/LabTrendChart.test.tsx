import React from "react";
import renderer, { act } from "react-test-renderer";

import { LabTrendChart } from "@/lib/ui/labs/LabTrendChart";
import { buildLabReferenceOverlay } from "@/lib/labs/history/buildLabReferenceOverlay";
import { buildLabTrendSeries } from "@/lib/labs/history/buildLabTrendSeries";
import { makeNumericHistoryPoint as numericPoint } from "@/lib/labs/history/__fixtures__/labTrendTestFixtures";
import type { LabHistoryPointDto } from "@/lib/contracts";

describe("LabTrendChart", () => {
  it("renders numeric graph with accessibility label", () => {
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
          rawReferenceRange: "<200",
        }),
        numericPoint({
          id: "c",
          collectedAt: "2020-09-24T00:00:00.000Z",
          sourceDocumentId: "d2",
          value: 186,
          rawReferenceRange: "<200",
        }),
        numericPoint({
          id: "d",
          collectedAt: "2020-06-05T00:00:00.000Z",
          sourceDocumentId: "d1",
          value: 173,
          rawReferenceRange: "<200",
        }),
      ],
    });
    const overlay = buildLabReferenceOverlay({
      graphEligibility: series.graphEligibility,
      points: series.points,
    });

    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <LabTrendChart series={series} referenceOverlay={overlay} />,
      );
    });

    const root = tree!.root.findByProps({ testID: "lab-trend-chart" });
    expect(root.props.accessibilityLabel).toContain("Total Cholesterol trend");
    expect(root.props.accessibilityLabel).toContain("4 results");
    expect(root.props.accessibilityLabel).toMatch(/Within Quest reference range/i);
    expect(root.props.accessibilityLabel.toLowerCase()).not.toMatch(
      /\boli\b|healthy|dangerous|optimal for you/,
    );
    expect(tree!.root.findByProps({ testID: "lab-trend-chart-selection" })).toBeTruthy();
    expect(tree!.root.findByProps({ testID: "lab-trend-chart-ref-caption" }).props.children).toBe(
      "Quest reference: <200 mg/dL",
    );
  });

  it("keeps approved graph shell when overlay is suppressed", () => {
    const series = buildLabTrendSeries({
      metricKey: "total_cholesterol",
      displayName: "Total Cholesterol",
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
    expect(overlay.kind).toBe("none");

    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <LabTrendChart series={series} referenceOverlay={overlay} />,
      );
    });

    expect(tree!.root.findByProps({ testID: "lab-trend-chart" })).toBeTruthy();
    expect(tree!.root.findAllByProps({ testID: "lab-trend-chart-ref-caption" })).toHaveLength(0);
    expect(tree!.root.findAllByProps({ testID: "lab-trend-ref-within" })).toHaveLength(0);
  });

  it("renders single-point state without a fake line", () => {
    const series = buildLabTrendSeries({
      metricKey: "apo_b",
      displayName: "ApoB",
      historyPoints: [
        numericPoint({
          id: "a",
          collectedAt: "2024-10-15T00:00:00.000Z",
          sourceDocumentId: "d1",
          value: 92,
        }),
      ],
    });

    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<LabTrendChart series={series} />);
    });

    expect(tree!.root.findByProps({ testID: "lab-trend-chart-single" })).toBeTruthy();
    const texts = tree!.root
      .findAllByType(require("react-native").Text)
      .map((t) => String(t.props.children));
    expect(texts.some((t) => t.includes("One result so far"))).toBe(true);
    expect(texts.some((t) => t.includes("92"))).toBe(true);
  });

  it("returns null for qualitative timeline (table owns presentation)", () => {
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

    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<LabTrendChart series={series} />);
    });
    expect(tree!.toJSON()).toBeNull();
  });
});
