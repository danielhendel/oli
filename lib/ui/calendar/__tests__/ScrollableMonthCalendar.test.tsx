import React from "react";
import { StyleSheet } from "react-native";
import renderer, { act } from "react-test-renderer";

import { OLI_DARK, OLI_LIGHT } from "@/lib/ui/theme/oliSemantic";
import { OliThemeProvider } from "@/lib/ui/theme/OliThemeContext";
import { MonthGrid } from "@/lib/ui/calendar/MonthGrid";
import {
  CALENDAR_MONTH_ITEM_HEIGHT,
  CANONICAL_CALENDAR_MONTHS_BACK,
  CANONICAL_CALENDAR_MONTHS_FORWARD,
  buildCanonicalScrollableMonths,
  findScrollableMonthIndex,
  SCROLLABLE_CALENDAR_MAX_SCROLL_RETRIES,
  ScrollableMonthCalendar,
} from "@/lib/ui/calendar/ScrollableMonthCalendar";

const months = [
  { key: "2025-12", monthYear: { year: 2025, month: 12 } },
  { key: "2026-01", monthYear: { year: 2026, month: 1 } },
  { key: "2026-06", monthYear: { year: 2026, month: 6 } },
  { key: "2026-07", monthYear: { year: 2026, month: 7 } },
];

function renderCalendar(mode: "light" | "dark", initialMonthIndex = 3) {
  const onDayPress = jest.fn();
  let tree!: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(
      <OliThemeProvider mode={mode}>
        <ScrollableMonthCalendar
          months={months}
          initialMonthIndex={initialMonthIndex}
          remountKey={`test:${initialMonthIndex}`}
          testID="test-scrollable-calendar"
          renderMonth={(item) => (
            <MonthGrid
              monthYear={item.monthYear}
              markerForDay={() => null}
              onDayPress={onDayPress}
              dayKeyBasis="local"
              selectedDay="2026-07-10"
              maxDay="2026-07-16"
              accessibilityDetailForDay={() => "Timeline day"}
            />
          )}
        />
      </OliThemeProvider>,
    );
  });
  return { tree, onDayPress };
}

describe("ScrollableMonthCalendar", () => {
  it("renders multiple vertically scrollable month sections", () => {
    const { tree } = renderCalendar("dark");
    expect(tree.root.findByProps({ testID: "test-scrollable-calendar" })).toBeTruthy();
    expect(
      tree.root.findAll(
        (node) =>
          typeof node.props?.testID === "string" &&
          node.props.testID.startsWith("scrollable-calendar-month-"),
      ).length,
    ).toBeGreaterThan(1);
  });

  it("anchors via findScrollableMonthIndex and a safe fixed item layout height", () => {
    expect(findScrollableMonthIndex(months, { year: 2026, month: 7 })).toBe(3);
    expect(findScrollableMonthIndex(months, { year: 2026, month: 6 })).toBe(2);
    expect(findScrollableMonthIndex(months, { year: 2099, month: 1 })).toBe(0);
    // Must be tall enough that preceding-month headings are not clipped by underscroll.
    expect(CALENDAR_MONTH_ITEM_HEIGHT).toBeGreaterThanOrEqual(400);
    expect(SCROLLABLE_CALENDAR_MAX_SCROLL_RETRIES).toBe(3);
    const offset = CALENDAR_MONTH_ITEM_HEIGHT * 3;
    expect(offset).toBe(1200);
  });

  it("buildCanonicalScrollableMonths is a symmetric ±12 window including future months", () => {
    const range = buildCanonicalScrollableMonths({ year: 2026, month: 7 });
    expect(range).toHaveLength(
      CANONICAL_CALENDAR_MONTHS_BACK + CANONICAL_CALENDAR_MONTHS_FORWARD + 1,
    );
    expect(range[0]?.key).toBe("2025-07");
    expect(range[CANONICAL_CALENDAR_MONTHS_BACK]?.key).toBe("2026-07");
    expect(range.at(-1)?.key).toBe("2027-07");
    expect(range.some((m) => m.key === "2026-08")).toBe(true);
  });

  it("keeps selected-month Month YYYY heading visible in the initial viewport model", () => {
    const { tree } = renderCalendar("dark", 3);
    const heading = tree.root.findByProps({ testID: "calendar-month-heading-2026-07" });
    expect(heading.props.children).toBe("July 2026");
    expect(heading.props.accessibilityRole).toBe("header");
    // No duplicate July heading Text in the sheet list.
    expect(
      tree.root.findAll(
        (node) =>
          node.type === "Text" &&
          node.props?.testID === "calendar-month-heading-2026-07",
      ),
    ).toHaveLength(1);
  });

  it("MonthGrid always renders Month YYYY before the day grid (including year boundary)", () => {
    for (const month of months) {
      let grid!: renderer.ReactTestRenderer;
      act(() => {
        grid = renderer.create(
          <OliThemeProvider mode="dark">
            <MonthGrid
              monthYear={month.monthYear}
              markerForDay={() => null}
              onDayPress={jest.fn()}
              dayKeyBasis="local"
            />
          </OliThemeProvider>,
        );
      });
      const heading = grid.root.findByProps({
        testID: `calendar-month-heading-${month.key}`,
      });
      expect(heading.props.children).toMatch(/^[A-Z][a-z]+ \d{4}$/);
      expect(heading.props.accessibilityRole).toBe("header");
      // Heading is the first Text child of the month container.
      const texts = grid.root.findAll((node) => node.type === "Text");
      expect(texts[0]?.props.testID).toBe(`calendar-month-heading-${month.key}`);
    }
  });

  it("every mounted month item includes its heading", () => {
    const { tree } = renderCalendar("dark");
    const monthItems = tree.root.findAll(
      (node) =>
        typeof node.props?.testID === "string" &&
        node.props.testID.startsWith("scrollable-calendar-month-"),
    );
    expect(monthItems.length).toBeGreaterThan(0);
    for (const item of monthItems) {
      const key = String(item.props.testID).replace("scrollable-calendar-month-", "");
      expect(
        item.findAll(
          (node: { type?: unknown; props?: { testID?: string } }) =>
            node.type === "Text" &&
            node.props?.testID === `calendar-month-heading-${key}`,
        ).length,
      ).toBe(1);
    }
  });

  it.each([
    ["dark", OLI_DARK.textPrimary],
    ["light", OLI_LIGHT.textPrimary],
  ] as const)("uses semantic primary contrast for month headings in %s mode", (mode, expected) => {
    const { tree } = renderCalendar(mode);
    const heading = tree.root.findByProps({ testID: "calendar-month-heading-2026-07" });
    const flattened = StyleSheet.flatten(heading.props.style);
    expect(flattened.color).toBe(expected);
    expect(flattened.opacity ?? 1).toBe(1);
    expect(heading.props.accessibilityRole).toBe("header");
  });

  it("announces selected and Today state, emits valid dates, and disables future dates", () => {
    const { tree, onDayPress } = renderCalendar("dark");
    const selected = tree.root.findByProps({
      accessibilityLabel: "2026-07-10, Timeline day, selected",
    });
    expect(selected.props.accessibilityState).toEqual({
      selected: true,
      disabled: false,
    });

    act(() => selected.props.onPress());
    expect(onDayPress).toHaveBeenCalledWith("2026-07-10");

    const today = tree.root.findByProps({
      accessibilityLabel: "2026-07-16, Timeline day, Today",
    });
    expect(today.props.accessibilityState.disabled).toBe(false);

    const future = tree.root.findByProps({
      accessibilityLabel: "2026-07-17, Timeline day, unavailable",
    });
    expect(future.props.accessibilityState.disabled).toBe(true);
    act(() => future.props.onPress?.());
    expect(onDayPress).not.toHaveBeenCalledWith("2026-07-17");
  });
});
