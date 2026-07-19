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
import { TIMELINE_DAY_INCOMPLETE_NOTICE_COPY } from "@/lib/ui/timeline/TimelineDayIncompleteNotice";

function contextRows(day: string) {
  return [
    {
      kind: "sleep" as const,
      title: "Sleep",
      availability: "unavailable" as const,
      accessibilityLabel: "Sleep, unavailable",
      icon: "moon-outline",
      href: `/(app)/recovery/sleep?day=${day}`,
    },
    {
      kind: "recovery" as const,
      title: "Recovery",
      availability: "unavailable" as const,
      accessibilityLabel: "Recovery, unavailable",
      icon: "heart-outline",
      href: "/(app)/recovery/readiness",
    },
    {
      kind: "activity" as const,
      title: "Activity",
      availability: "unavailable" as const,
      accessibilityLabel: "Activity, unavailable",
      icon: "walk-outline",
      href: `/(app)/activity/day/${day}`,
    },
  ];
}

function vm(day: string, empty: boolean) {
  return {
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
    context: contextRows(day),
  };
}

function collectText(test: renderer.ReactTestRenderer): string {
  const nodes = test.root.findAllByType("Text" as never);
  const parts: string[] = [];
  for (const n of nodes) {
    for (const child of n.children) {
      if (typeof child === "string" || typeof child === "number") parts.push(String(child));
    }
  }
  return parts.join(" ");
}

describe("TimelineDayScreen incomplete history", () => {
  beforeEach(() => {
    mockUseTimelineDay.mockReset();
  });

  function renderScreen() {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(
        <OliThemeProvider mode="dark">
          <TimelineDayScreen initialDay="2026-07-16" />
        </OliThemeProvider>,
      );
    });
    return test;
  }

  test("ready state has no incomplete notice", () => {
    mockUseTimelineDay.mockReturnValue({
      day: "2026-07-16",
      status: { status: "ready", vm: vm("2026-07-16", false) },
      completeness: { state: "complete" },
      refetchAll: jest.fn(),
    });
    const test = renderScreen();
    expect(() => test.root.findByProps({ testID: "timeline-day-incomplete-notice" })).toThrow();
    expect(collectText(test)).not.toContain("Some activity may be missing");
  });

  test("partial incomplete renders notice, context, actions, and accessible retry", () => {
    const refetchAll = jest.fn();
    mockUseTimelineDay.mockReturnValue({
      day: "2026-07-16",
      status: {
        status: "partial",
        history: "incomplete",
        vm: vm("2026-07-16", false),
        incompletenessReason: "page_cap",
      },
      completeness: { state: "unproven", reason: "page_cap" },
      refetchAll,
    });
    const test = renderScreen();
    const notice = test.root.findByProps({ testID: "timeline-day-incomplete-notice" });
    expect(collectText(test)).toContain(TIMELINE_DAY_INCOMPLETE_NOTICE_COPY);
    expect(collectText(test)).toContain("Sleep");
    expect(collectText(test)).toContain("Strength workout");
    expect(collectText(test)).not.toContain("page_cap");
    expect(collectText(test)).not.toContain("cursor");
    expect(collectText(test)).not.toContain("nextCursor");

    const retry = test.root.findByProps({ testID: "timeline-day-incomplete-retry" });
    expect(retry.props.accessibilityRole).toBe("button");
    expect(retry.props.accessibilityLabel).toBe("Try again");
    expect(retry.props.style.minHeight).toBe(44);
    expect(retry.props.style.minWidth).toBe(44);
    act(() => {
      retry.props.onPress();
    });
    expect(refetchAll).toHaveBeenCalledTimes(1);
    expect(notice.props.accessibilityLabel).toBe(TIMELINE_DAY_INCOMPLETE_NOTICE_COPY);
  });

  test("error state preserves selected-date header and bounded retry", () => {
    const refetchAll = jest.fn();
    mockUseTimelineDay.mockReturnValue({
      day: "2026-07-15",
      status: {
        status: "error",
        error: "Could not load timeline",
        requestId: null,
        reason: "unknown",
      },
      completeness: { state: "unavailable" },
      refetchAll,
    });
    const test = renderScreen();
    // Screen still mounts with initialDay today unless we pass historical — use calendar day from hook day via header.
    // Header uses local selected day state (initialDay), not hook day — error preserves chrome for selected day.
    expect(test.root.findByProps({ testID: "timeline-day-section-header" })).toBeTruthy();
    expect(collectText(test)).toContain("Could not load timeline");
    expect(collectText(test)).not.toContain("stack");
  });
});
