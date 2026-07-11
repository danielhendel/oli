import React, { act } from "react";
import { Pressable, Text } from "react-native";
import renderer from "react-test-renderer";

import { DashMetricRow } from "@/lib/ui/dash/DashMetricRow";

describe("DashMetricRow", () => {
  it("renders label and value", () => {
    let root!: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(
        <DashMetricRow label="Duration" displayValue="8h" accessibilityValue="8 hours" />,
      );
    });
    const texts = root.root.findAllByType(Text).map((t) => String(t.props.children));
    expect(texts).toContain("Duration");
    expect(texts).toContain("8h");
  });

  it("renders chevron and invokes onPress when actionable", () => {
    const onPress = jest.fn();
    let root!: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(
        <DashMetricRow
          testID="metric-row"
          label="HRV balance"
          displayValue="Good"
          accessibilityValue="Good"
          accessibilityHint="Opens readiness details"
          onPress={onPress}
        />,
      );
    });
    const pressable = root.root.findByType(Pressable);
    expect(pressable.props.accessibilityRole).toBe("button");
    expect(pressable.props.accessibilityLabel).toBe("HRV balance. Good");
    expect(pressable.props.accessibilityHint).toBe("Opens readiness details");
    expect(pressable.props.style({ pressed: false })).toEqual(
      expect.arrayContaining([expect.objectContaining({ minHeight: 44 })]),
    );
    const texts = root.root.findAllByType(Text).map((t) => String(t.props.children));
    expect(texts).toContain("\u203A");
    act(() => {
      pressable.props.onPress();
    });
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("hides chevron when no onPress", () => {
    let root!: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(
        <DashMetricRow label="Duration" displayValue="8h" accessibilityValue="8 hours" />,
      );
    });
    expect(() => root.root.findByType(Pressable)).toThrow();
    const texts = root.root.findAllByType(Text).map((t) => String(t.props.children));
    expect(texts).not.toContain("\u203A");
  });

  it("announces unavailable values as Not available", () => {
    let root!: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(
        <DashMetricRow
          label="Recovery index"
          displayValue={"\u2014"}
          accessibilityValue="Not available"
          onPress={() => undefined}
        />,
      );
    });
    expect(root.root.findByType(Pressable).props.accessibilityLabel).toBe(
      "Recovery index. Not available",
    );
  });
});
