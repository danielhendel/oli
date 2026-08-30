import React from "react";
import renderer, { act } from "react-test-renderer";

import {
  buildLabTrendReferenceOverlayGeometry,
  LabTrendChart,
} from "@/lib/ui/labs/LabTrendChart";
import { buildLabChartDomainWithReference } from "@/lib/labs/history/buildLabChartDomainWithReference";
import { buildLabTrendSeries } from "@/lib/labs/history/buildLabTrendSeries";
import { makeNumericHistoryPoint as numericPoint } from "@/lib/labs/history/__fixtures__/labTrendTestFixtures";
import { buildLabMetricStandardOverlay } from "@/lib/labs/standard/buildLabMetricStandardOverlay";
import { getLabMetricStandard } from "@/lib/labs/standard/labMetricStandardCatalog";
import type { LabHistoryPointDto } from "@/lib/contracts";
import { UI_RECOMMENDED_RANGE_FILL } from "@/lib/ui/theme/recommendedRangeChrome";

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
  it("renders Total Cholesterol with metric-standard framing and green in-range band", () => {
    const series = buildLabTrendSeries({
      metricKey: "total_cholesterol",
      displayName: "Total Cholesterol",
      historyPoints: signedInLikeCholesterolHistory(),
    });
    const metricStandard = getLabMetricStandard("total_cholesterol");
    const overlay = buildLabMetricStandardOverlay(metricStandard);

    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <LabTrendChart
          series={series}
          standardOverlay={overlay}
          metricStandard={metricStandard}
        />,
      );
    });
    act(() => {
      tree!.root.findByProps({ testID: "lab-trend-chart" }).props.onLayout({
        nativeEvent: { layout: { x: 0, y: 0, width: 320, height: 200 } },
      });
    });

    const root = tree!.root.findByProps({ testID: "lab-trend-chart" });
    expect(root.props.accessibilityLabel).toContain("Within standard");
    expect(root.props.accessibilityLabel).toContain("Standard: Under 200 mg/dL");
    expect(root.props.accessibilityLabel.toLowerCase()).not.toMatch(/quest/);

    // Visible Trend card: status + standard once each — no duplicate caption.
    expect(tree!.root.findAllByProps({ testID: "lab-trend-chart-ref-caption" })).toHaveLength(0);
    const selection = tree!.root.findByProps({ testID: "lab-trend-chart-selection" });
    const selectionTexts = selection
      .findAllByType(require("react-native").Text)
      .map((n) => String(n.props.children));
    expect(selectionTexts.filter((l) => l === "Within standard")).toHaveLength(1);
    expect(selectionTexts.filter((l) => l === "Standard: Under 200 mg/dL")).toHaveLength(1);
    expect(selectionTexts).toEqual(
      expect.arrayContaining(["Within standard", "Standard: Under 200 mg/dL"]),
    );
    expect(tree!.root.findAllByProps({ testID: "lab-trend-chart-ref-key" })).toHaveLength(0);

    const chartRootTexts = tree!.root
      .findByProps({ testID: "lab-trend-chart" })
      .findAllByType(require("react-native").Text)
      .map((t) => String(t.props.children));
    expect(chartRootTexts.filter((t) => t === "Standard: Under 200 mg/dL")).toHaveLength(1);

    const within = tree!.root.findByProps({ testID: "lab-trend-ref-within" });
    expect(within.props.fill).toBe(UI_RECOMMENDED_RANGE_FILL);
    expect(within.props.height).toBeGreaterThan(8);
    expect(tree!.root.findByProps({ testID: "lab-trend-ref-outside" }).props.height).toBeGreaterThan(8);
    expect(tree!.root.findByProps({ testID: "lab-trend-ref-threshold" })).toBeTruthy();

    const domain = buildLabChartDomainWithReference(series.points, overlay)!;
    const geo = buildLabTrendReferenceOverlayGeometry({
      overlay,
      domain,
      plotW: 296,
      plotH: 124,
    })!;
    const yAt = (value: number) => {
      const yRange = domain.yMax - domain.yMin;
      return 16 + 124 - ((value - domain.yMin) / yRange) * 124;
    };
    expect(yAt(179)).toBeGreaterThan(geo.thresholds[0]!);
    expect(yAt(208)).toBeLessThan(geo.thresholds[0]!);
  });

  it("keeps approved graph shell when no metric standard overlay", () => {
    const series = buildLabTrendSeries({
      metricKey: "apo_b",
      displayName: "ApoB",
      historyPoints: [
        numericPoint({
          id: "a",
          collectedAt: "2024-10-15T00:00:00.000Z",
          sourceDocumentId: "d2",
          value: 92,
          rawReferenceRange: null,
        }),
        numericPoint({
          id: "b",
          collectedAt: "2022-07-07T00:00:00.000Z",
          sourceDocumentId: "d1",
          value: 100,
          rawReferenceRange: null,
        }),
      ],
    });

    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<LabTrendChart series={series} />);
    });

    expect(tree!.root.findByProps({ testID: "lab-trend-chart" })).toBeTruthy();
    expect(tree!.root.findAllByProps({ testID: "lab-trend-chart-standard-context" })).toHaveLength(0);
    expect(tree!.root.findAllByProps({ testID: "lab-trend-ref-within" })).toHaveLength(0);
    expect(tree!.root.findAllByProps({ testID: "lab-trend-chart-ref-key" })).toHaveLength(0);
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
