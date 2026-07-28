import React from "react";
import renderer, { act } from "react-test-renderer";

import { LabsMainContent, isLabsSummaryEmpty } from "@/lib/ui/labs/LabsMainContent";

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe("LabsMainContent states", () => {
  it("shows loading while partial", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <LabsMainContent status="partial" onPressMetric={jest.fn()} />,
      );
    });
    const str = JSON.stringify(tree.toJSON());
    expect(str).toContain("Loading labs…");
    expect(str).toContain("labs-loading");
  });

  it("shows honest empty state for zero records without category cards", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <LabsMainContent
          status="ready"
          data={{ ok: true, uploadCount: 0, categories: [] }}
          onPressMetric={jest.fn()}
        />,
      );
    });
    const str = JSON.stringify(tree.toJSON());
    expect(str).toContain("No lab reports yet");
    expect(str).toContain("Structured extraction is not available yet");
    expect(str).toContain("labs-empty-state");
    expect(str).not.toContain("labs-category-card");
    expect(str).not.toMatch(/LDL|HDL|HbA1c/i);
  });

  it("shows error with retry and does not remain loading", () => {
    const onRetry = jest.fn();
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <LabsMainContent
          status="error"
          error="Network failed"
          requestId="rid-1"
          onRetry={onRetry}
          onPressMetric={jest.fn()}
        />,
      );
    });
    const str = JSON.stringify(tree.toJSON());
    expect(str).toContain("labs-error");
    expect(str).toContain("Network failed");
    expect(str).toContain("Try again");
    expect(str).not.toContain("Loading labs…");

    const btn = tree.root.findByProps({ accessibilityLabel: "Try again" });
    act(() => {
      btn.props.onPress();
    });
    expect(onRetry).toHaveBeenCalled();
  });

  it("renders category cards when structured values exist", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <LabsMainContent
          status="ready"
          data={{
            ok: true,
            uploadCount: 1,
            categories: [
              {
                categoryKey: "cardiovascular",
                displayName: "Cardiovascular Health",
                metrics: [
                  {
                    metricKey: "ldl_c",
                    displayName: "LDL-C",
                    latestValueText: "92 mg/dL",
                    flag: "normal",
                  },
                ],
              },
            ],
          }}
          onPressMetric={jest.fn()}
        />,
      );
    });
    expect(tree.root.findByProps({ testID: "labs-main-content" })).toBeTruthy();
    expect(tree.root.findByProps({ testID: "labs-category-card-cardiovascular" })).toBeTruthy();
  });

  it("treats dash-only catalog rows as empty", () => {
    expect(
      isLabsSummaryEmpty({
        ok: true,
        uploadCount: 0,
        categories: [
          {
            categoryKey: "cardiovascular",
            displayName: "Cardiovascular Health",
            metrics: [{ metricKey: "ldl_c", displayName: "LDL-C", latestValueText: "—" }],
          },
        ],
      }),
    ).toBe(true);
  });
});
