// lib/ui/timeline/__tests__/TimelineDayScreen.v1Chrome.test.tsx
// Timeline v1 — Plan vs actual and day-arrow navigator must be absent (T4–T5).
// Day-section header must appear above events and update with calendar selection.

import React from "react";
import renderer, { act } from "react-test-renderer";

const mockUseTimelineDay = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock("@/lib/time/dayKey", () => ({
  getTodayDayKey: () => "2026-07-16",
}));

jest.mock("@/lib/features/timeline/useTimelineDay", () => ({
  useTimelineDay: (...args: unknown[]) => mockUseTimelineDay(...args),
}));

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({ user: { uid: "test-user" }, initializing: false }),
}));

import { TimelineDayScreen } from "@/lib/ui/timeline/TimelineDayScreen";
import { OliThemeProvider } from "@/lib/ui/theme/OliThemeContext";

function readyVm(day: string, empty: boolean) {
  return {
    day,
    status: {
      status: "ready" as const,
      vm: {
        day,
        items: empty
          ? []
          : [
              {
                id: "1",
                day,
                timestamp: `${day}T10:00:00.000Z`,
                sortKey: `${day}T10:00:00.000Z#1`,
                title: "Strength workout",
                sourceType: "workout_strength",
                sourceId: "1",
                icon: "barbell-outline",
                href: `/(app)/workouts/day/${day}`,
                isPassive: false,
                accessibilityLabel: "Strength workout",
              },
            ],
        isEmpty: empty,
        summary: null,
        context: [
          {
            kind: "sleep",
            title: "Sleep",
            availability: "unavailable",
            accessibilityLabel: "Sleep, unavailable",
            icon: "moon-outline",
            href: "/(app)/recovery/sleep?day=" + day,
          },
          {
            kind: "recovery",
            title: "Recovery",
            availability: "unavailable",
            accessibilityLabel: "Recovery, unavailable",
            icon: "heart-outline",
            href: "/(app)/recovery/readiness",
          },
          {
            kind: "activity",
            title: "Activity",
            availability: "unavailable",
            accessibilityLabel: "Activity, unavailable",
            icon: "walk-outline",
            href: "/(app)/activity/day/" + day,
          },
        ],
      },
    },
    refetchAll: jest.fn(),
  };
}

function collectAllText(test: renderer.ReactTestRenderer): string {
  const nodes = test.root.findAllByType("Text" as never);
  const parts: string[] = [];
  for (const n of nodes) {
    for (const child of n.children) {
      if (typeof child === "string" || typeof child === "number") parts.push(String(child));
    }
  }
  return parts.join(" ");
}

describe("TimelineDayScreen v1 chrome", () => {
  beforeEach(() => {
    mockUseTimelineDay.mockReset();
    mockUseTimelineDay.mockImplementation((day: string) => readyVm(day, false));
  });

  function renderScreen(initialDay = "2026-07-16") {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(
        <OliThemeProvider mode="dark">
          <TimelineDayScreen initialDay={initialDay} />
        </OliThemeProvider>,
      );
    });
    return test;
  }

  it("does not render Plan vs actual header or day navigator", () => {
    const test = renderScreen();
    const text = collectAllText(test);
    expect(text).toContain("Timeline");
    expect(text).toContain("Your day, in order");
    expect(text).not.toMatch(/Plan vs actual/i);
    expect(text).not.toMatch(/Activity target/i);
    expect(text).not.toMatch(/Food calories/i);
    expect(text).not.toMatch(/Jump to today/i);

    const a11y = test.root
      .findAll((n) => typeof n.props?.accessibilityLabel === "string")
      .map((n) => String(n.props.accessibilityLabel));
    expect(a11y).toContain("Open timeline calendar");
    expect(a11y.some((l) => /previous day|next day/i.test(l))).toBe(false);
    expect(a11y.some((l) => /^Settings$/i.test(l))).toBe(false);
    act(() => test.unmount());
  });

  it("renders one centered day-section header above the first event", () => {
    const test = renderScreen("2026-07-16");
    const headers = test.root.findAll(
      (n) =>
        n.props?.testID === "timeline-day-section-header" &&
        n.props?.accessibilityRole === "header",
    );
    expect(headers.length).toBeGreaterThanOrEqual(1);
    expect(
      new Set(headers.map((h) => h.props.accessibilityLabel)),
    ).toEqual(new Set(["Today, July 16, 2026"]));

    const text = collectAllText(test);
    expect(text).toContain("Today July 16, 2026");
    expect(text.indexOf("Today July 16, 2026")).toBeLessThan(text.indexOf("Strength workout"));
    expect(text.match(/July 16, 2026/g)?.length).toBe(1);
    expect(text).not.toMatch(/\n\s*July 16/);
    act(() => test.unmount());
  });

  it("updates the day header after calendar selection and Return to Today", () => {
    const test = renderScreen("2026-07-16");
    const button = test.root.findByProps({ testID: "timeline-calendar-button" });
    act(() => button.props.onPress());

    const july10 = test.root.findByProps({
      accessibilityLabel: "2026-07-10, Timeline day",
    });
    act(() => july10.props.onPress());

    expect(mockUseTimelineDay).toHaveBeenCalledWith("2026-07-10");
    expect(
      test.root.find(
        (n) =>
          n.props?.testID === "timeline-day-section-header" &&
          n.props?.accessibilityRole === "header",
      ).props.accessibilityLabel,
    ).toBe("Friday, July 10, 2026");

    act(() => button.props.onPress());
    const todayBtn = test.root.findByProps({ accessibilityLabel: "Return to today" });
    act(() => todayBtn.props.onPress());
    expect(
      test.root.find(
        (n) =>
          n.props?.testID === "timeline-day-section-header" &&
          n.props?.accessibilityRole === "header",
      ).props.accessibilityLabel,
    ).toBe("Today, July 16, 2026");
    expect(collectAllText(test)).toContain("Today July 16, 2026");
    act(() => test.unmount());
  });

  it("keeps the day header on an empty selected day", () => {
    mockUseTimelineDay.mockImplementation((day: string) => readyVm(day, true));
    const test = renderScreen("2026-07-10");
    expect(
      test.root.find(
        (n) =>
          n.props?.testID === "timeline-day-section-header" &&
          n.props?.accessibilityRole === "header",
      ).props.accessibilityLabel,
    ).toBe("Friday, July 10, 2026");
    expect(collectAllText(test)).toContain("Fri July 10, 2026");
    expect(collectAllText(test)).toContain("Nothing logged");
    act(() => test.unmount());
  });

  it("opens the shared scrollable calendar from the header control", () => {
    const test = renderScreen();
    const button = test.root.findByProps({ testID: "timeline-calendar-button" });
    act(() => button.props.onPress());
    expect(
      test.root.findByProps({ testID: "timeline-scrollable-calendar" }),
    ).toBeTruthy();
    act(() => test.unmount());
  });

  it("does not issue an extra timeline request merely to render the heading", () => {
    const test = renderScreen("2026-07-16");
    const callsBefore = mockUseTimelineDay.mock.calls.length;
    act(() => {
      test.update(
        <OliThemeProvider mode="dark">
          <TimelineDayScreen initialDay="2026-07-16" />
        </OliThemeProvider>,
      );
    });
    expect(mockUseTimelineDay.mock.calls.length).toBe(callsBefore + 1);
    expect(mockUseTimelineDay.mock.calls.every((c: unknown[]) => c[0] === "2026-07-16")).toBe(
      true,
    );
    act(() => test.unmount());
  });

  it("shows compact Today control only when viewing another day", () => {
    const todayTree = renderScreen("2026-07-16");
    expect(todayTree.root.findAllByProps({ testID: "timeline-return-to-today" })).toHaveLength(0);
    const hist = renderScreen("2026-07-14");
    expect(hist.root.findByProps({ testID: "timeline-return-to-today" }).props.accessibilityRole).toBe(
      "button",
    );
  });

  it("renders daily context card and never TimelineFeedScreen", () => {
    const src = require("node:fs").readFileSync(
      require("node:path").join(__dirname, "..", "TimelineDayScreen.tsx"),
      "utf8",
    );
    expect(src).toContain("DailyTimelineContextCard");
    expect(src).not.toContain("EXPO_PUBLIC_TIMELINE_FEED");
    expect(src).not.toContain("TimelineFeedScreen");
    const test = renderScreen();
    expect(test.root.findByProps({ testID: "timeline-daily-context-card" }).props.accessibilityRole).toBe(
      "summary",
    );
  });
});
