import React from "react";
import { StyleSheet } from "react-native";
import renderer, { act } from "react-test-renderer";

import { OLI_DARK, OLI_LIGHT } from "@/lib/ui/theme/oliSemantic";
import { OliThemeProvider } from "@/lib/ui/theme/OliThemeContext";
import {
  CANONICAL_CALENDAR_MONTHS_BACK,
  CANONICAL_CALENDAR_MONTHS_FORWARD,
  buildCanonicalScrollableMonths,
  findScrollableMonthIndex,
} from "@/lib/ui/calendar/ScrollableMonthCalendar";
import {
  buildTimelineCalendarMonths,
  TimelineCalendarSheet,
} from "@/lib/ui/timeline/TimelineCalendarSheet";

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 12, right: 0, bottom: 20, left: 0 }),
}));

jest.mock("@/lib/ui/calendar/dateUtils", () => {
  const actual = jest.requireActual("@/lib/ui/calendar/dateUtils");
  return {
    ...actual,
    getTodayDayKeyLocal: () => "2026-07-16",
  };
});

describe("TimelineCalendarSheet", () => {
  function render(mode: "light" | "dark", selectedDay = "2026-07-10", visible = true) {
    const onSelectDay = jest.fn();
    const onCancel = jest.fn();
    const onReturnToToday = jest.fn();
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <OliThemeProvider mode={mode}>
          <TimelineCalendarSheet
            visible={visible}
            selectedDay={selectedDay}
            onSelectDay={onSelectDay}
            onCancel={onCancel}
            onReturnToToday={onReturnToToday}
          />
        </OliThemeProvider>,
      );
    });
    return { tree, onSelectDay, onCancel, onReturnToToday };
  }

  it.each([
    ["dark", OLI_DARK.textPrimary],
    ["light", OLI_LIGHT.textPrimary],
  ] as const)("renders readable year and month headings in %s mode", (mode, expected) => {
    const { tree } = render(mode);
    const year = tree.root.findByProps({ testID: "timeline-calendar-year-heading" });
    const yearStyle = StyleSheet.flatten(year.props.style);
    expect(yearStyle.color).toBe(expected);
    expect(yearStyle.opacity ?? 1).toBe(1);
    expect(year.props.accessibilityRole).toBe("header");

    const month = tree.root.findByProps({ testID: "calendar-month-heading-2026-07" });
    expect(month.props.children).toBe("July 2026");
    const monthStyle = StyleSheet.flatten(month.props.style);
    expect(monthStyle.color).toBe(expected);
    expect(monthStyle.opacity ?? 1).toBe(1);

    const julyHeadings = tree.root.findAll(
      (node) =>
        node.type === "Text" &&
        node.props?.testID === "calendar-month-heading-2026-07",
    );
    expect(julyHeadings).toHaveLength(1);
  });

  it("anchors the list to the selected month and keeps the selected day in the model", () => {
    const months = buildTimelineCalendarMonths({ year: 2026, month: 7 });
    const expectedIndex = findScrollableMonthIndex(months, { year: 2026, month: 7 });
    expect(months[expectedIndex]?.key).toBe("2026-07");

    const { tree } = render("dark", "2026-07-10");
    expect(tree.root.findByProps({ testID: "timeline-scrollable-calendar" })).toBeTruthy();
    expect(tree.root.findByProps({ testID: "timeline-calendar-fixed-header" })).toBeTruthy();
    expect(
      tree.root.findByProps({ testID: "calendar-month-heading-2026-07" }).props.children,
    ).toBe("July 2026");
    expect(
      tree.root.findByProps({
        accessibilityLabel: "2026-07-10, Timeline day, selected",
      }),
    ).toBeTruthy();
  });

  it("includes canonical future months while maxDay keeps future days disabled", () => {
    const months = buildTimelineCalendarMonths({ year: 2026, month: 7 });
    expect(months).toEqual(buildCanonicalScrollableMonths({ year: 2026, month: 7 }));
    expect(months).toHaveLength(
      CANONICAL_CALENDAR_MONTHS_BACK + CANONICAL_CALENDAR_MONTHS_FORWARD + 1,
    );
    expect(months[CANONICAL_CALENDAR_MONTHS_BACK]?.key).toBe("2026-07");
    expect(months.some((month) => month.key === "2026-08")).toBe(true);
    expect(months.at(-1)?.key).toBe("2027-07");

    const { tree, onSelectDay } = render("dark", "2026-07-16");
    const tomorrow = tree.root.findByProps({
      accessibilityLabel: "2026-07-17, Timeline day, unavailable",
    });
    expect(tomorrow.props.accessibilityState.disabled).toBe(true);
    expect(tomorrow.props.disabled).toBe(true);
    act(() => tomorrow.props.onPress?.());
    expect(onSelectDay).not.toHaveBeenCalled();

    // Future month cells are in the month model (scroll chrome); FlatList may
    // virtualize them out of the initial tree — prove via month list + August
    // heading when scrolled into render by remounting at August index is out
    // of scope; assert generation + disabled future day in current month.
    expect(months.find((m) => m.key === "2026-08")?.monthYear).toEqual({
      year: 2026,
      month: 8,
    });
  });

  it("disables future days in a future month without emitting selection", () => {
    let tree!: renderer.ReactTestRenderer;
    const onSelectDay = jest.fn();
    act(() => {
      tree = renderer.create(
        <OliThemeProvider mode="dark">
          <TimelineCalendarSheet
            visible
            selectedDay="2026-07-16"
            onSelectDay={onSelectDay}
            onCancel={jest.fn()}
            onReturnToToday={jest.fn()}
          />
        </OliThemeProvider>,
      );
    });

    // Render August grid directly with Timeline maxDay contract.
    const { MonthGrid } = require("@/lib/ui/calendar/MonthGrid") as typeof import("@/lib/ui/calendar/MonthGrid");
    let august!: renderer.ReactTestRenderer;
    act(() => {
      august = renderer.create(
        <OliThemeProvider mode="dark">
          <MonthGrid
            monthYear={{ year: 2026, month: 8 }}
            markerForDay={() => null}
            onDayPress={onSelectDay}
            dayKeyBasis="local"
            selectedDay="2026-07-16"
            maxDay="2026-07-16"
            accessibilityDetailForDay={() => "Timeline day"}
          />
        </OliThemeProvider>,
      );
    });
    expect(
      august.root.findByProps({ testID: "calendar-month-heading-2026-08" }).props.children,
    ).toBe("August 2026");
    const futureDay = august.root.findByProps({
      accessibilityLabel: "2026-08-01, Timeline day, unavailable",
    });
    expect(futureDay.props.accessibilityState.disabled).toBe(true);
    act(() => futureDay.props.onPress?.());
    expect(onSelectDay).not.toHaveBeenCalled();
    expect(tree.root.findByProps({ testID: "timeline-scrollable-calendar" })).toBeTruthy();
  });

  it("reopening remounts the calendar and preserves the selected month heading", () => {
    const { tree } = render("dark", "2026-06-15");
    expect(
      tree.root.findByProps({ testID: "calendar-month-heading-2026-06" }).props.children,
    ).toBe("June 2026");

    act(() => {
      tree.update(
        <OliThemeProvider mode="dark">
          <TimelineCalendarSheet
            visible={false}
            selectedDay="2026-06-15"
            onSelectDay={jest.fn()}
            onCancel={jest.fn()}
            onReturnToToday={jest.fn()}
          />
        </OliThemeProvider>,
      );
    });
    expect(
      tree.root.findAll((node) => node.props?.testID === "timeline-scrollable-calendar"),
    ).toHaveLength(0);

    act(() => {
      tree.update(
        <OliThemeProvider mode="dark">
          <TimelineCalendarSheet
            visible
            selectedDay="2026-06-15"
            onSelectDay={jest.fn()}
            onCancel={jest.fn()}
            onReturnToToday={jest.fn()}
          />
        </OliThemeProvider>,
      );
    });
    expect(tree.root.findByProps({ testID: "timeline-scrollable-calendar" })).toBeTruthy();
    expect(
      tree.root.findByProps({ testID: "calendar-month-heading-2026-06" }).props.children,
    ).toBe("June 2026");
    const months = buildTimelineCalendarMonths({ year: 2026, month: 7 });
    expect(months.some((m) => m.key === "2026-08")).toBe(true);
  });

  it("Today reanchors current month and keeps future months in the visible window", () => {
    const today = "2026-07-16";
    const { tree, onReturnToToday } = render("dark", "2026-05-01");
    const todayBtn = tree.root.findByProps({ accessibilityLabel: "Return to today" });
    act(() => todayBtn.props.onPress());
    expect(onReturnToToday).toHaveBeenCalledTimes(1);

    act(() => {
      tree.update(
        <OliThemeProvider mode="dark">
          <TimelineCalendarSheet
            visible
            selectedDay={today}
            onSelectDay={jest.fn()}
            onCancel={jest.fn()}
            onReturnToToday={jest.fn()}
          />
        </OliThemeProvider>,
      );
    });
    expect(
      tree.root.findByProps({ testID: "calendar-month-heading-2026-07" }).props.children,
    ).toBe("July 2026");
    const future = tree.root.findByProps({
      accessibilityLabel: "2026-07-17, Timeline day, unavailable",
    });
    expect(future.props.accessibilityState.disabled).toBe(true);
    const months = buildTimelineCalendarMonths({ year: 2026, month: 7 });
    expect(months.some((m) => m.key > "2026-07")).toBe(true);
  });

  it("keeps local day basis and selectable maxDay separate from visible months", () => {
    const source = require("node:fs").readFileSync(
      require("node:path").join(__dirname, "..", "TimelineCalendarSheet.tsx"),
      "utf8",
    );
    expect(source).toContain('dayKeyBasis="local"');
    expect(source).toContain("maxDay={today}");
    expect(source).toContain("buildCanonicalScrollableMonths");
    expect(source).not.toMatch(/if \(key > todayKey\)/);
  });

  it("selects the expected day and Cancel does not change selection", () => {
    const { tree, onSelectDay, onCancel } = render("dark");
    const selected = tree.root.findByProps({
      accessibilityLabel: "2026-07-10, Timeline day, selected",
    });
    act(() => selected.props.onPress());
    expect(onSelectDay).toHaveBeenCalledWith("2026-07-10");

    const cancel = tree.root.findByProps({
      accessibilityLabel: "Cancel timeline calendar",
    });
    act(() => cancel.props.onPress());
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSelectDay).toHaveBeenCalledTimes(1);
  });

  it("cross-year future months appear in the shared visible window", () => {
    const lateYear = buildTimelineCalendarMonths({ year: 2026, month: 12 });
    expect(lateYear.some((m) => m.key === "2027-01")).toBe(true);
    expect(lateYear.at(-1)?.key).toBe("2027-12");
    for (const month of lateYear) {
      expect(month.key).toMatch(/^\d{4}-\d{2}$/);
    }
  });
});
