import React from "react";
import renderer, { act } from "react-test-renderer";
import type { ReactTestInstance } from "react-test-renderer";
import { NutritionTimeWheelPicker } from "@/lib/ui/nutrition/NutritionTimeWheelPicker";

jest.mock("react-native/Libraries/Lists/FlatList", () => {
  const React = require("react");
  const { View } = require("react-native");
  const FlatListMock = ({
    data,
    renderItem,
  }: {
    data: readonly unknown[];
    renderItem: (info: { item: unknown; index: number }) => React.ReactNode;
  }) => (
    <View>
      {data.map((item, index) => (
        <React.Fragment key={`row-${index}`}>{renderItem({ item, index })}</React.Fragment>
      ))}
    </View>
  );
  return { __esModule: true, default: FlatListMock };
});

function visibleStrings(root: ReactTestInstance): string[] {
  const out: string[] = [];
  root.findAll((node) => {
    const c = node.props?.children;
    if (typeof c === "string") out.push(c);
    return false;
  });
  return out;
}

describe("NutritionTimeWheelPicker", () => {
  it("renders column headers and wheel columns", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <NutritionTimeWheelPicker
          value={{ hour12: 9, minute: 5, meridiem: "PM" }}
          onChange={jest.fn()}
        />,
      );
    });
    const flat = JSON.stringify(tree.toJSON());
    expect(flat).toContain("Hour");
    expect(flat).toContain("Minute");
    expect(flat).toContain("AM/PM");
    expect(tree.root.findByProps({ testID: "nutrition-time-wheel-hour" })).toBeTruthy();
    expect(tree.root.findByProps({ testID: "nutrition-time-wheel-minute" })).toBeTruthy();
    expect(tree.root.findByProps({ testID: "nutrition-time-wheel-meridiem" })).toBeTruthy();
    act(() => tree.unmount());
  });

  it("shows clean visible values 1 / 05 / PM without Hour/Minute/Period prefixes", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <NutritionTimeWheelPicker
          value={{ hour12: 1, minute: 5, meridiem: "PM" }}
          onChange={jest.fn()}
        />,
      );
    });

    const texts = visibleStrings(tree.root);
    expect(texts).toContain("1");
    expect(texts).toContain("05");
    expect(texts).toContain("PM");
    expect(texts.some((t) => t.startsWith("Hour "))).toBe(false);
    expect(texts.some((t) => t.startsWith("Minute "))).toBe(false);
    expect(texts.some((t) => t.startsWith("Period "))).toBe(false);

    act(() => tree.unmount());
  });

  it("keeps descriptive accessibility labels on wheel rows", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <NutritionTimeWheelPicker
          value={{ hour12: 2, minute: 22, meridiem: "AM" }}
          onChange={jest.fn()}
        />,
      );
    });

    expect(
      tree.root.findAll((n) => n.props?.accessibilityLabel === "Hour 2").length,
    ).toBeGreaterThan(0);
    expect(
      tree.root.findAll((n) => n.props?.accessibilityLabel === "Minute 22").length,
    ).toBeGreaterThan(0);
    expect(
      tree.root.findAll((n) => n.props?.accessibilityLabel === "Period AM").length,
    ).toBeGreaterThan(0);

    act(() => tree.unmount());
  });
});
