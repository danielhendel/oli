import React from "react";
import { StyleSheet } from "react-native";
import renderer, { act } from "react-test-renderer";
import { readFileSync } from "node:fs";
import { join } from "node:path";

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

function uniqueMonthItemTestIds(tree: renderer.ReactTestRenderer): string[] {
  const ids = tree.root
    .findAll(
      (node) =>
        typeof node.props?.testID === "string" &&
        node.props.testID.startsWith("scrollable-calendar-month-"),
    )
    .map((node) => String(node.props.testID));
  return [...new Set(ids)];
}

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
    expect(months.length).toBeGreaterThan(1);
    const { tree } = renderCalendar("dark", 0);
    expect(tree.root.findByProps({ testID: "test-scrollable-calendar" })).toBeTruthy();
    // FlatList may mount a subset; the first month must be present when anchored at 0.
    expect(
      uniqueMonthItemTestIds(tree).some((id) => id === "scrollable-calendar-month-2025-12"),
    ).toBe(true);
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
    // Cross-year: past December and future January around a July center.
    expect(range.some((m) => m.key === "2025-12")).toBe(true);
    expect(range.some((m) => m.key === "2027-01")).toBe(true);
  });

  it("wires initialScrollIndex and getItemLayout to the selected-month index", () => {
    const source = readFileSync(
      join(__dirname, "..", "ScrollableMonthCalendar.tsx"),
      "utf8",
    );
    expect(source).toContain("initialScrollIndex={clampedIndex}");
    expect(source).toContain("getItemLayout={(_, index) => ({");
    expect(source).toContain("length: CALENDAR_MONTH_ITEM_HEIGHT");
    expect(source).toContain("offset: CALENDAR_MONTH_ITEM_HEIGHT * index");
    expect(source).toContain("SCROLLABLE_CALENDAR_MAX_SCROLL_RETRIES");
    expect(findScrollableMonthIndex(months, { year: 2026, month: 7 })).toBe(3);
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
    const monthIds = uniqueMonthItemTestIds(tree);
    expect(monthIds.length).toBeGreaterThan(0);
    for (const testID of monthIds) {
      const key = testID.replace("scrollable-calendar-month-", "");
      expect(
        tree.root.findAll(
          (node) =>
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

  it("invokes renderMonth for the anchored selected month with consumer month data", () => {
    const renderMonth = jest.fn((item: (typeof months)[number]) => (
      <MonthGrid
        monthYear={item.monthYear}
        markerForDay={() => null}
        onDayPress={jest.fn()}
        dayKeyBasis="local"
        selectedDay="2026-07-10"
        maxDay="2026-07-16"
        accessibilityDetailForDay={() => "Timeline day"}
      />
    ));
    act(() => {
      renderer.create(
        <OliThemeProvider mode="dark">
          <ScrollableMonthCalendar
            months={months}
            initialMonthIndex={3}
            remountKey="bounds"
            testID="test-scrollable-calendar"
            renderMonth={renderMonth}
          />
        </OliThemeProvider>,
      );
    });
    const julyCall = renderMonth.mock.calls.find((call) => call[0]?.key === "2026-07");
    expect(julyCall?.[0]).toEqual({
      key: "2026-07",
      monthYear: { year: 2026, month: 7 },
    });
  });
});
