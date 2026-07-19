import React from "react";
import { StyleSheet } from "react-native";
import renderer, { act } from "react-test-renderer";

import { MonthGrid } from "@/lib/ui/calendar/MonthGrid";
import { OliThemeProvider } from "@/lib/ui/theme/OliThemeContext";

jest.mock("@/lib/ui/calendar/dateUtils", () => {
  const actual = jest.requireActual("@/lib/ui/calendar/dateUtils");
  return {
    ...actual,
    getTodayDayKeyLocal: () => "2026-07-16",
  };
});

function renderGrid(args?: {
  selectedDay?: string;
  maxDay?: string;
}) {
  const onDayPress = jest.fn();
  let tree!: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(
      <OliThemeProvider mode="dark">
        <MonthGrid
          monthYear={{ year: 2026, month: 7 }}
          markerForDay={() => null}
          onDayPress={onDayPress}
          dayKeyBasis="local"
          selectedDay={args?.selectedDay ?? "2026-07-10"}
          maxDay={args?.maxDay ?? "2026-07-16"}
          accessibilityDetailForDay={() => "Timeline day"}
        />
      </OliThemeProvider>,
    );
  });
  return { tree, onDayPress };
}

describe("MonthGrid day selection semantics", () => {
  it("announces selected day state and emits onDayPress for an allowed day", () => {
    const { tree, onDayPress } = renderGrid();
    const selected = tree.root.findByProps({
      accessibilityLabel: "2026-07-10, Timeline day, selected",
    });
    expect(selected.props.accessibilityRole).toBe("button");
    expect(selected.props.accessibilityState).toEqual({
      selected: true,
      disabled: false,
    });

    act(() => selected.props.onPress());
    expect(onDayPress).toHaveBeenCalledWith("2026-07-10");
  });

  it("announces Today for the local today day key", () => {
    const { tree } = renderGrid({ selectedDay: "2026-07-10" });
    const today = tree.root.findByProps({
      accessibilityLabel: "2026-07-16, Timeline day, Today",
    });
    expect(today.props.accessibilityState).toEqual({
      selected: false,
      disabled: false,
    });
  });

  it("announces selected + Today when the selected day is today", () => {
    const { tree, onDayPress } = renderGrid({ selectedDay: "2026-07-16" });
    const todaySelected = tree.root.findByProps({
      accessibilityLabel: "2026-07-16, Timeline day, Today, selected",
    });
    expect(todaySelected.props.accessibilityState).toEqual({
      selected: true,
      disabled: false,
    });
    act(() => todaySelected.props.onPress());
    expect(onDayPress).toHaveBeenCalledWith("2026-07-16");
  });

  it("keeps future days visible, disabled, unselected, and non-emitting", () => {
    const { tree, onDayPress } = renderGrid();
    const future = tree.root.findByProps({
      accessibilityLabel: "2026-07-17, Timeline day, unavailable",
    });
    expect(future.props.accessibilityState).toEqual({
      selected: false,
      disabled: true,
    });
    expect(future.props.disabled).toBe(true);

    const flattened = StyleSheet.flatten(future.props.style({ pressed: false }));
    expect(flattened.opacity).toBe(0.35);

    act(() => future.props.onPress?.());
    expect(onDayPress).not.toHaveBeenCalled();
    expect(onDayPress).not.toHaveBeenCalledWith("2026-07-17");
  });

  it("does not mark a future day as selected when selection remains on an allowed day", () => {
    const { tree } = renderGrid({ selectedDay: "2026-07-10" });
    const future = tree.root.findByProps({
      accessibilityLabel: "2026-07-17, Timeline day, unavailable",
    });
    expect(future.props.accessibilityState).toEqual({
      selected: false,
      disabled: true,
    });
  });
});
