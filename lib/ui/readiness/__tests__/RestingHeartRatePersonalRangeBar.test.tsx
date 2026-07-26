import React, { act } from "react";
import { Text } from "react-native";
import renderer, { type ReactTestInstance } from "react-test-renderer";

import { RestingHeartRatePersonalRangeBar } from "@/lib/ui/readiness/RestingHeartRatePersonalRangeBar";

function allVisibleText(root: ReactTestInstance): string {
  return root
    .findAllByType(Text)
    .map((t) => {
      const ch = t.props.children;
      if (typeof ch === "string") return ch;
      if (Array.isArray(ch)) return ch.filter((x): x is string => typeof x === "string").join("");
      return "";
    })
    .join("|");
}

describe("RestingHeartRatePersonalRangeBar", () => {
  it("renders three zones, dynamic bounds, and one marker", () => {
    let root!: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(
        <RestingHeartRatePersonalRangeBar
          belowLabel="Below Usual"
          usualLabel="Your Usual"
          aboveLabel="Above Usual"
          belowRangeText="<48 bpm"
          usualRangeText="48–54 bpm"
          aboveRangeText=">54 bpm"
          zoneFractions={{ below: 0.3, usual: 0.4, above: 0.3 }}
          currentMarkerPosition01={0.45}
          accessibilitySummary="49 beats per minute. This is in your usual range."
        />,
      );
    });

    const flat = allVisibleText(root.root);
    expect(flat).toContain("Below Usual");
    expect(flat).toContain("Your Usual");
    expect(flat).toContain("Above Usual");
    expect(flat).toContain("<48 bpm");
    expect(flat).toContain("48–54 bpm");
    expect(flat).toContain(">54 bpm");
    expect(root.root.findByProps({ testID: "resting-heart-rate-personal-range-below-zone" })).toBeDefined();
    expect(root.root.findByProps({ testID: "resting-heart-rate-personal-range-usual-zone" })).toBeDefined();
    expect(root.root.findByProps({ testID: "resting-heart-rate-personal-range-above-zone" })).toBeDefined();
    expect(root.root.findByProps({ testID: "resting-heart-rate-personal-range-marker" })).toBeDefined();
    expect(() => root.root.findByProps({ testID: "resting-heart-rate-personal-range-marker-2" })).toThrow();
    expect(flat).not.toMatch(/legend|Optimal|Healthy/i);
  });
});
