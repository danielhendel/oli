import React, { act } from "react";
import renderer from "react-test-renderer";

import { classifySleepDurationReference } from "@/lib/data/sleep/sleepDurationReference";
import { SleepDurationReferenceRangeBar } from "@/lib/ui/sleep/SleepDurationReferenceRangeBar";
import {
  UI_RECOMMENDED_RANGE_FILL,
  UI_REFERENCE_ZONE_NEUTRAL_FILL,
} from "@/lib/ui/theme/uiTokens";

describe("SleepDurationReferenceRangeBar", () => {
  it("renders Below Typical / Recommended / Above Typical with strong recommended fill", () => {
    const result = classifySleepDurationReference({ durationMinutes: 391, ageYears: 30 })!;
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <SleepDurationReferenceRangeBar
          result={result}
          durationMinutes={391}
          accessibilitySummary="Sleep Duration 6h 31m. Below Typical."
        />,
      );
    });
    const root = tree.root;
    const text = root
      .findAllByType(require("react-native").Text)
      .map((t: { props: { children?: unknown } }) => String(t.props.children ?? ""))
      .join("|");
    expect(text).toContain("Below Typical");
    expect(text).not.toContain("Below recommended");
    expect(text).toContain("Recommended");
    expect(text).toContain("Above Typical");
    expect(text).toContain("< 7h");
    expect(text).toContain("7h–9h");
    expect(text).toContain("> 9h");
    const bar = root.findByProps({ testID: "sleep-duration-reference-bar" });
    expect(bar.props.accessibilityLabel).toContain("6h 31m");
    expect(root.findByProps({ testID: "sleep-duration-reference-bar-marker" })).toBeDefined();

    const recommended = root.findByProps({
      testID: "sleep-duration-reference-bar-recommended-zone",
    });
    const recFlat = Array.isArray(recommended.props.style)
      ? Object.assign({}, ...recommended.props.style.filter(Boolean))
      : recommended.props.style;
    expect(recFlat.backgroundColor).toBe(UI_RECOMMENDED_RANGE_FILL);
    expect(recFlat.backgroundColor).not.toBe(UI_REFERENCE_ZONE_NEUTRAL_FILL);
  });

  it("clamps marker for out-of-domain values without changing classification", () => {
    const result = classifySleepDurationReference({ durationMinutes: 200, ageYears: 30 })!;
    expect(result.status).toBe("below_recommended");
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <SleepDurationReferenceRangeBar
          result={result}
          durationMinutes={200}
          accessibilitySummary="below"
        />,
      );
    });
    const marker = tree.root.findByProps({ testID: "sleep-duration-reference-bar-marker" });
    const style = marker.props.style;
    const flat = Array.isArray(style) ? Object.assign({}, ...style) : style;
    expect(flat.left).toBe("0%");
  });

  it("keeps 65+ recommended geometry narrower than adult", () => {
    const adult = classifySleepDurationReference({ durationMinutes: 450, ageYears: 30 })!;
    const older = classifySleepDurationReference({ durationMinutes: 450, ageYears: 70 })!;
    expect(adult.upperRecommendedMinutes).toBe(540);
    expect(older.upperRecommendedMinutes).toBe(480);
  });
});
