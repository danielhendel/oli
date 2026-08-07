import React from "react";
import renderer, { act } from "react-test-renderer";

import {
  buildLabTrendReferenceOverlayGeometry,
  LabTrendChart,
} from "@/lib/ui/labs/LabTrendChart";
import { buildLabChartDomainWithReference } from "@/lib/labs/history/buildLabChartDomainWithReference";
import { buildLabReferenceOverlay } from "@/lib/labs/history/buildLabReferenceOverlay";
import { buildLabTrendSeries } from "@/lib/labs/history/buildLabTrendSeries";
import { makeNumericHistoryPoint as numericPoint } from "@/lib/labs/history/__fixtures__/labTrendTestFixtures";
import type { LabHistoryPointDto } from "@/lib/contracts";
import { UI_REFERENCE_ZONE_NEUTRAL_FILL } from "@/lib/ui/theme/recommendedRangeChrome";

function signedInLikeCholesterolHistory() {
  return [
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
      rawReferenceRange: "<200",
    }),
  ];
}

describe("LabTrendChart", () => {
  it("renders numeric graph with accessibility label", () => {
    const series = buildLabTrendSeries({
      metricKey: "total_cholesterol",
      displayName: "Total Cholesterol",
      historyPoints: signedInLikeCholesterolHistory(),
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

  it("renders visible upper-bound reference zones for signed-in-like Total Cholesterol", () => {
    const series = buildLabTrendSeries({
      metricKey: "total_cholesterol",
      displayName: "Total Cholesterol",
      historyPoints: signedInLikeCholesterolHistory(),
    });
    const overlay = buildLabReferenceOverlay({
      graphEligibility: series.graphEligibility,
      points: series.points,
    });
    expect(overlay.kind).toBe("upper_bound");
    if (overlay.kind !== "upper_bound") throw new Error("expected upper_bound");

    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <LabTrendChart series={series} referenceOverlay={overlay} />,
      );
    });
    act(() => {
      tree!.root.findByProps({ testID: "lab-trend-chart" }).props.onLayout({
        nativeEvent: { layout: { x: 0, y: 0, width: 320, height: 200 } },
      });
    });

    const within = tree!.root.findByProps({ testID: "lab-trend-ref-within" });
    const outside = tree!.root.findByProps({ testID: "lab-trend-ref-outside" });
    const threshold = tree!.root.findByProps({ testID: "lab-trend-ref-threshold" });

    expect(within.props.width).toBeGreaterThan(0);
    expect(within.props.height).toBeGreaterThan(8);
    expect(outside.props.width).toBeGreaterThan(0);
    expect(outside.props.height).toBeGreaterThan(8);
    expect(within.props.fill).toBe(UI_REFERENCE_ZONE_NEUTRAL_FILL);
    expect(String(outside.props.fill)).toMatch(/rgba?\(/);
    expect(Number.parseFloat(String(outside.props.fill).split(",").pop() ?? "0")).toBeGreaterThan(
      0.1,
    );
    expect(threshold.props.strokeWidth).toBeGreaterThanOrEqual(1.5);

    const domain = buildLabChartDomainWithReference(series.points, overlay)!;
    const geo = buildLabTrendReferenceOverlayGeometry({
      overlay,
      domain,
      plotW: 296,
      plotH: 124,
    })!;
    expect(geo.within!.height).toBeGreaterThan(0);
    expect(geo.outsideHigh!.height).toBeGreaterThan(0);
    expect(geo.thresholds[0]).toBeGreaterThan(16);
    expect(geo.thresholds[0]).toBeLessThan(16 + 124);

    const yAt = (value: number) => {
      const yRange = domain.yMax - domain.yMin;
      return 16 + 124 - ((value - domain.yMin) / yRange) * 124;
    };
    const y179 = yAt(179);
    const y208 = yAt(208);
    const yThresh = geo.thresholds[0]!;
    // Higher values → smaller y. 179 below threshold line (reference side), 208 above.
    expect(y179).toBeGreaterThan(yThresh);
    expect(y208).toBeLessThan(yThresh);

    expect(tree!.root.findByProps({ testID: "lab-trend-chart-ref-key" })).toBeTruthy();
    expect(tree!.root.findByProps({ testID: "lab-trend-ref-overlay" })).toBeTruthy();
  });

  it("keeps approved graph shell when overlay is absent", () => {
    const series = buildLabTrendSeries({
      metricKey: "total_cholesterol",
      displayName: "Total Cholesterol",
      historyPoints: [
        numericPoint({
          id: "a",
          collectedAt: "2024-10-15T00:00:00.000Z",
          sourceDocumentId: "d2",
          value: 179,
          rawReferenceRange: null,
        }),
        numericPoint({
          id: "b",
          collectedAt: "2022-07-07T00:00:00.000Z",
          sourceDocumentId: "d1",
          value: 208,
          rawReferenceRange: null,
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
