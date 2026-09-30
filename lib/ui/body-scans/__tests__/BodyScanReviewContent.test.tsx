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
        fieldId: "total:visceral_fat_mass",
        metricId: "visceral_fat_mass",
        region: "total",
        label: "Visceral Fat Mass",
        rawValue: "688 g",
        normalizedValue: 0.688,
        unit: "kg",
        confidence: 0.95,
        requiresReview: false,
      },
      {
        fieldId: "total:visceral_fat_volume",
        metricId: "visceral_fat_volume",
        region: "total",
        label: "Visceral Fat Volume",
        rawValue: "912 cm³",
        normalizedValue: 912,
        unit: "cm3",
        confidence: 0.95,
        requiresReview: false,
      },
      {
        fieldId: "total:fat_free_mass",
        metricId: "fat_free_mass",
        region: "total",
        label: "Fat-Free Mass",
        rawValue: "128.5 lb",
        normalizedValue: 58.2862,
        unit: "kg",
        confidence: 0.95,
        requiresReview: false,
      },
      {
        fieldId: "total:android_gynoid_ratio",
        metricId: "android_gynoid_ratio",
        region: "total",
        label: "Android / Gynoid Ratio",
        rawValue: "1.15",
        normalizedValue: 1.15,
        unit: "ratio",
        confidence: 0.95,
        requiresReview: false,
      },
      {
        fieldId: "total:bone_mineral_density",
        metricId: "bone_mineral_density",
        region: "total",
        label: "Bone Mineral Density",
        rawValue: "1.186 g/cm²",
        normalizedValue: 1.186,
        unit: "g_per_cm2",
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
      acknowledgedFieldIds: [
        "total:fat_percent",
        "total:visceral_fat_mass",
        "total:visceral_fat_volume",
        "total:fat_free_mass",
        "total:android_gynoid_ratio",
        "total:bone_mineral_density",
        "total:lean_mass",
      ],
    });
  });

  it("renders VAT, FFM, A/G precision, and BMD candidates", () => {
    const test = render(
      <BodyScanReviewContent status="ready" review={review()} onConfirm={jest.fn()} />,
    );
    expect(test.root.findByProps({ testID: "body-scan-review-field-total:visceral_fat_mass" })).toBeTruthy();
    expect(test.root.findByProps({ testID: "body-scan-review-field-total:visceral_fat_volume" })).toBeTruthy();
    expect(test.root.findByProps({ testID: "body-scan-review-field-total:fat_free_mass" })).toBeTruthy();
    expect(test.root.findByProps({ testID: "body-scan-review-field-total:android_gynoid_ratio" })).toBeTruthy();
    expect(test.root.findByProps({ testID: "body-scan-review-field-total:bone_mineral_density" })).toBeTruthy();
    expect(
      test.root.findByProps({ testID: "body-scan-review-input-total:android_gynoid_ratio" }).props.value,
    ).toBe("1.15");
    expect(
      test.root.findByProps({ testID: "body-scan-review-input-total:fat_free_mass" }).props.value,
    ).toBe("58.3");
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
      acknowledgedFieldIds: [
        "total:fat_percent",
        "total:visceral_fat_mass",
        "total:visceral_fat_volume",
        "total:fat_free_mass",
        "total:android_gynoid_ratio",
        "total:bone_mineral_density",
        "total:lean_mass",
      ],
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
