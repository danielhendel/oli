import React from "react";
import renderer, { act } from "react-test-renderer";

import { WaistLandingCard } from "@/lib/ui/body/WaistLandingCard";
import type { WaistHistoryPoint } from "@/lib/data/body/waistHistoryPoints";

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
  StyleSheet: { create: (s: unknown) => s, hairlineWidth: 1 },
}));

const LATEST: WaistHistoryPoint = {
  rawEventId: "w1",
  observedAt: "2026-03-04T12:00:00.000Z",
  dayKey: "2026-03-04",
  waistCm: 82.5,
  sourceId: "manual",
  protocolId: "who_midpoint_v1",
};

function collectText(tree: renderer.ReactTestRenderer): string {
  return tree.root
    .findAllByType("Text")
    .flatMap((node) => node.children)
    .filter((x) => typeof x === "string")
    .join(" ");
}

describe("WaistLandingCard", () => {
  it("shows empty copy when there is no dated measurement", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <WaistLandingCard
          latest={null}
          lengthUnit="cm"
          status="ready"
          onPressCard={jest.fn()}
          onPressAdd={jest.fn()}
        />,
      );
    });
    const text = collectText(tree);
    expect(tree.root.findByProps({ testID: "waist-landing-card-empty" })).toBeDefined();
    expect(text).toContain("Add a waist measurement");
    expect(text).toContain("Add a dated measurement to track changes.");
    expect(tree.root.findAllByProps({ testID: "waist-landing-card-latest" })).toHaveLength(0);
  });

  it("shows latest dated value and date; Add invokes onPressAdd", () => {
    const onPressAdd = jest.fn();
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <WaistLandingCard
          latest={LATEST}
          lengthUnit="in"
          status="ready"
          onPressCard={jest.fn()}
          onPressAdd={onPressAdd}
        />,
      );
    });
    expect(tree.root.findByProps({ testID: "waist-landing-card-latest" })).toBeDefined();
    expect(collectText(tree)).toMatch(/in/);
    expect(tree.root.findByProps({ testID: "waist-landing-card-date" })).toBeDefined();
    act(() => {
      tree.root.findByProps({ testID: "waist-landing-card-add" }).props.onPress({
        stopPropagation: jest.fn(),
      });
    });
    expect(onPressAdd).toHaveBeenCalledTimes(1);
  });
});
