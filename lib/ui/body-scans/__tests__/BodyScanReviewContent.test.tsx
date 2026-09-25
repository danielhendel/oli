import React from "react";
import renderer, { act } from "react-test-renderer";

import type { BodyScanReviewResponseDto } from "@/lib/contracts";
import { BodyScanReviewContent } from "@/lib/ui/body-scans/BodyScanReviewContent";

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
  Switch: "Switch",
  TextInput: "TextInput",
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

function review(overrides: Partial<BodyScanReviewResponseDto> = {}): BodyScanReviewResponseDto {
  return {
    ok: true,
    scanId: "scan1",
    status: "needs_review",
    scanType: "dxa",
    method: "dxa",
    performedAt: "2026-02-17T00:00:00.000Z",
    deviceLabel: "GE Lunar iDXA",
    adapterLabel: "Live Lean Rx DXA",
    fields: [
      {
        fieldId: "total:fat_percent",
        metricId: "fat_percent",
        region: "total",
        label: "Body Fat",
        rawValue: "24.8",
        normalizedValue: 24.8,
        unit: "percent",
        confidence: 0.95,
        requiresReview: false,
      },
      {
        fieldId: "total:lean_mass",
        metricId: "lean_mass",
        region: "total",
        label: "Lean Mass",
        rawValue: "55,310",
        normalizedValue: 55.31,
        unit: "kg",
        confidence: 0.55,
        requiresReview: true,
      },
    ],
    safeWarnings: [],
    manualReviewOnly: false,
    confirmAvailable: true,
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

describe("BodyScanReviewContent", () => {
  it("will not confirm while a low-confidence value is unacknowledged", () => {
    const onConfirm = jest.fn();
    const test = render(
      <BodyScanReviewContent status="ready" review={review()} onConfirm={onConfirm} />,
    );
    act(() => {
      test.root.findByProps({ testID: "body-scan-review-confirm" }).props.onPress();
    });
    expect(onConfirm).not.toHaveBeenCalled();
    expect(
      test.root.findAllByProps({ testID: "body-scan-review-blocked" }).length,
    ).toBeGreaterThan(0);
  });

  it("confirms once the user acknowledges the flagged value", () => {
    const onConfirm = jest.fn();
    const test = render(
      <BodyScanReviewContent status="ready" review={review()} onConfirm={onConfirm} />,
    );
    act(() => {
      test.root
        .findByProps({ testID: "body-scan-review-ack-total:lean_mass" })
        .props.onValueChange(true);
    });
    act(() => {
      test.root.findByProps({ testID: "body-scan-review-confirm" }).props.onPress();
    });
    expect(onConfirm).toHaveBeenCalledWith({
      corrections: [],
      acknowledgedFieldIds: ["total:fat_percent", "total:lean_mass"],
    });
  });

  it("sends a cleared value as missing rather than zero", () => {
    const onConfirm = jest.fn();
    const test = render(
      <BodyScanReviewContent status="ready" review={review()} onConfirm={onConfirm} />,
    );
    act(() => {
      test.root
        .findByProps({ testID: "body-scan-review-input-total:lean_mass" })
        .props.onChangeText("");
      test.root
        .findByProps({ testID: "body-scan-review-ack-total:lean_mass" })
        .props.onValueChange(true);
    });
    act(() => {
      test.root.findByProps({ testID: "body-scan-review-confirm" }).props.onPress();
    });
    expect(onConfirm).toHaveBeenCalledWith({
      corrections: [{ fieldId: "total:lean_mass", value: null }],
      acknowledgedFieldIds: ["total:fat_percent", "total:lean_mass"],
    });
  });

  it("blocks an unreadable entry and explains what to do", () => {
    const onConfirm = jest.fn();
    const test = render(
      <BodyScanReviewContent status="ready" review={review()} onConfirm={onConfirm} />,
    );
    act(() => {
      test.root
        .findByProps({ testID: "body-scan-review-input-total:fat_percent" })
        .props.onChangeText("about 25");
    });
    expect(
      test.root.findAllByProps({ testID: "body-scan-review-error-total:fat_percent" }).length,
    ).toBeGreaterThan(0);
    act(() => {
      test.root.findByProps({ testID: "body-scan-review-confirm" }).props.onPress();
    });
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("offers manual review when no values could be read", () => {
    const test = render(
      <BodyScanReviewContent
        status="ready"
        review={review({ fields: [], manualReviewOnly: true, confirmAvailable: false })}
        onConfirm={jest.fn()}
      />,
    );
    expect(
      test.root.findAllByProps({ testID: "body-scan-review-manual-only" }).length,
    ).toBeGreaterThan(0);
    expect(test.root.findAllByProps({ testID: "body-scan-review-confirm" })).toHaveLength(0);
  });

  it("disables saving while a confirmation is in flight", () => {
    const test = render(
      <BodyScanReviewContent
        status="ready"
        review={review()}
        submitting
        onConfirm={jest.fn()}
      />,
    );
    expect(
      test.root.findByProps({ testID: "body-scan-review-confirm" }).props.disabled,
    ).toBe(true);
  });
});
