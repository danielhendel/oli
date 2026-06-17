import React from "react";
import renderer, { act } from "react-test-renderer";
import type { ReactTestInstance } from "react-test-renderer";
import { NutritionWheelColumn } from "@/lib/ui/nutrition/NutritionWheelColumn";

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
    <View testID="flatlist-mock">
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

describe("NutritionWheelColumn", () => {
  it("shows clean display labels without accessibility prefixes", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <NutritionWheelColumn
          data={[1, 2, 22] as const}
          value={22}
          onValueChange={jest.fn()}
          getDisplayLabel={(v) => (v === 22 ? "22" : String(v))}
          getAccessibilityLabel={(v) => `Minute ${v === 22 ? "22" : v}`}
          testID="minute-col"
        />,
      );
    });

    expect(visibleStrings(tree.root)).toContain("22");
    expect(visibleStrings(tree.root).some((t) => t.startsWith("Minute "))).toBe(false);

    const flat = JSON.stringify(tree.toJSON());
    expect(flat).toMatch(/"accessibilityLabel":"Minute 22"/);

    act(() => tree.unmount());
  });

  it("keeps descriptive accessibility labels on rows", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <NutritionWheelColumn
          data={["AM", "PM"] as const}
          value="PM"
          onValueChange={jest.fn()}
          getDisplayLabel={(m) => m}
          getAccessibilityLabel={(m) => `Period ${m}`}
          testID="period-col"
        />,
      );
    });

    expect(visibleStrings(tree.root)).toContain("PM");
    expect(
      tree.root.findAll((n) => n.props?.accessibilityLabel === "Period PM").length,
    ).toBeGreaterThan(0);

    act(() => tree.unmount());
  });
});
