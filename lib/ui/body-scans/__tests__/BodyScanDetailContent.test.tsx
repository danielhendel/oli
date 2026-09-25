import React from "react";
import renderer, { act } from "react-test-renderer";

import type { BodyScanDetailDto } from "@/lib/contracts";
import { BodyScanDetailContent } from "@/lib/ui/body-scans/BodyScanDetailContent";

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
  StyleSheet: { create: (s: unknown) => s, hairlineWidth: 1 },
}));

jest.mock("@/lib/ui/ScreenStates", () => {
  const ReactLocal = require("react");
  return {
    LoadingState: (props: { message?: string }) =>
      ReactLocal.createElement("Text", { testID: "loading" }, props.message),
    ErrorState: (props: { message: string }) =>
      ReactLocal.createElement("Text", { testID: "error" }, props.message),
    EmptyState: (props: { title: string; testID?: string }) =>
      ReactLocal.createElement("Text", { testID: props.testID ?? "empty" }, props.title),
  };
});

function collectText(test: renderer.ReactTestRenderer): string {
  return test.root
    .findAllByType("Text")
    .flatMap((node) => node.children)
    .filter((x): x is string => typeof x === "string")
    .join(" ");
}

/** Labels of the measurement rows only — section notes are disclaimers, not labels. */
function rowLabels(test: renderer.ReactTestRenderer): string[] {
  return test.root
    .findAll((node) => node.props.accessibilityLabel != null && typeof node.props.accessibilityLabel === "string")
    .map((node) => String(node.props.accessibilityLabel));
}

function scan(overrides: Partial<BodyScanDetailDto> = {}): BodyScanDetailDto {
  return {
    id: "scan1",
    scanType: "dxa",
    method: "dxa",
    status: "verified",
    statusLabel: "Measurements saved",
    performedAt: "2026-02-17T00:00:00.000Z",
    uploadedAt: "2026-02-18T00:00:00.000Z",
    deviceLabel: "GE Lunar iDXA",
    adapterLabel: "Live Lean Rx DXA",
    sourceFilename: "scan.pdf",
    metrics: [
      { metricId: "fat_percent", region: "total", value: 24.8, unit: "percent", rawLabel: null, corrected: false },
      { metricId: "lean_mass", region: "left_arm", value: 3.01, unit: "kg", rawLabel: null, corrected: false },
      { metricId: "lean_mass", region: "right_arm", value: 3.166, unit: "kg", rawLabel: null, corrected: false },
      { metricId: "bone_mineral_density", region: "total", value: 1.186, unit: "g_per_cm2", rawLabel: null, corrected: false },
    ],
    safeWarnings: [],
    canReview: false,
    canRetry: true,
    canDelete: true,
    canViewOriginal: true,
    ...overrides,
  };
}

function render(element: React.ReactElement) {
  let test!: renderer.ReactTestRenderer;
  act(() => {
    test = renderer.create(element);
  });
  return test;
}

describe("BodyScanDetailContent", () => {
  it("renders the designed sections in order", () => {
    const test = render(
      <BodyScanDetailContent status="ready" scan={scan()} onRetry={jest.fn()} />,
    );
    const sectionIds = test.root
      .findAll((node) => typeof node.props.testID === "string" && node.props.testID.startsWith("body-scan-section-"))
      .map((node) => node.props.testID);
    expect(sectionIds).toEqual([
      "body-scan-section-overview",
      "body-scan-section-regional_lean_balance",
      "body-scan-section-total_body_bone",
      "body-scan-section-source",
    ]);
  });

  it("shows lean mass as Lean Mass and never relabels it as muscle", () => {
    const labels = rowLabels(render(<BodyScanDetailContent status="ready" scan={scan()} />));
    expect(labels.some((label) => label.includes("Lean Mass"))).toBe(true);
    for (const label of labels) {
      expect(label.toLowerCase()).not.toContain("muscle");
      expect(label.toLowerCase()).not.toContain("smm");
    }
  });

  it("never shows a score, grade, or classification band", () => {
    const text = collectText(render(<BodyScanDetailContent status="ready" scan={scan()} />)).toLowerCase();
    for (const forbidden of ["optimal", "excellence", "score", "grade", "percentile"]) {
      expect(text).not.toContain(forbidden);
    }
  });

  it("says a missing source value is absent instead of showing zero", () => {
    const text = collectText(
      render(
        <BodyScanDetailContent
          status="ready"
          scan={scan({ deviceLabel: null, adapterLabel: null, performedAt: null })}
        />,
      ),
    );
    expect(text).toContain("Not in this report");
    expect(text).not.toContain("0.0");
  });

  it("explains an empty scan instead of rendering blank sections", () => {
    const test = render(
      <BodyScanDetailContent
        status="ready"
        scan={scan({ metrics: [], status: "needs_review", statusLabel: "Needs your review" })}
      />,
    );
    expect(
      test.root.findAllByProps({ testID: "body-scan-detail-no-metrics" }).length,
    ).toBeGreaterThan(0);
  });

  it("offers only the actions the scan supports", () => {
    const onPress = jest.fn();
    const test = render(
      <BodyScanDetailContent
        status="ready"
        scan={scan()}
        actions={[{ label: "Delete this scan", onPress, testID: "body-scan-action-delete" }]}
      />,
    );
    act(() => {
      test.root.findByProps({ testID: "body-scan-action-delete" }).props.onPress();
    });
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("shows loading, not-found, and error states distinctly", () => {
    expect(render(<BodyScanDetailContent status="partial" />).root.findAllByProps({ testID: "loading" }).length).toBe(1);
    expect(
      render(<BodyScanDetailContent status="not_found" />).root.findAllByProps({
        testID: "body-scan-not-found",
      }).length,
    ).toBeGreaterThan(0);
    expect(
      render(<BodyScanDetailContent status="error" error="Could not load this scan" />).root.findAllByProps({
        testID: "error",
      }).length,
    ).toBeGreaterThan(0);
  });
});
