/**
 * Mode A header hierarchy: fixed header is Oli; Daily Monitor title/date live in scroll content.
 */

import React, { act } from "react";
import renderer from "react-test-renderer";

import {
  DAILY_MONITOR_APP_HEADER_TITLE,
  DAILY_MONITOR_SCREEN_TITLE,
  LEGACY_DASH_SCREEN_TITLE,
} from "@/lib/data/dash/dashDailyMonitorFoundation";
import { allowConsoleForThisTest } from "../../../scripts/test/consoleGuard";

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: { uid: "u1" },
    initializing: false,
    getIdToken: jest.fn(async () => "test-token"),
  }),
}));

jest.mock("@/lib/hooks/useCurrentLocalDayKey", () => ({
  useCurrentLocalDayKey: () => ({ dayKey: "2026-07-20" }),
}));

jest.mock("@/lib/ui/calendar/dayKeyDisplayFormat", () => ({
  formatDayKeyStackNavTitle: () => "Mon Jul 20, 2026",
}));

jest.mock("@/lib/hooks/useTodayHealthHero", () => ({
  useTodayHealthHero: () => ({
    energy: undefined,
    energyLoading: false,
    energyError: null,
    sleepCardVm: { status: "missing", day: "2026-07-20", message: "No sleep" },
    exactDayRestingHeartRateBpm: null,
    attributedSleepNight: null,
    attributedSleepResolution: null,
    refetch: jest.fn(),
    refetchSleep: jest.fn(),
  }),
}));

jest.mock("@/lib/hooks/useDailyReadinessCard", () => ({
  useDailyReadinessCard: () => ({
    vm: { status: "missing", day: "2026-07-20", message: "Waiting" },
    refetch: jest.fn(),
  }),
}));

jest.mock("@/lib/data/dash/useBodyCompositionDashCard", () => ({
  useBodyCompositionDashCard: () => ({
    loading: false,
    error: null,
    hasUser: true,
    goalsHref: "/(app)/body/settings",
    overviewDay: null,
    built: { tag: "empty" as const },
  }),
}));

jest.mock("@/lib/data/dash/useDailyNutritionCard", () => ({
  useDailyNutritionCard: () => ({
    model: { calorieLabel: "—", hasAnyNutrition: false, rows: [] },
    loading: false,
    error: null,
  }),
}));

const mockActivityHook = jest.fn(() => ({
  presence: "absent_no_day_evidence" as const,
  model: null,
  href: "/(app)/activity" as const,
  refetch: jest.fn(),
}));
const mockSessionHook = jest.fn(() => ({
  workoutPresence: "absent_no_day_evidence" as const,
  workoutModel: null,
  workoutHref: "/(app)/workouts" as const,
  cardioPresence: "absent_no_day_evidence" as const,
  cardioModel: null,
  cardioHref: "/(app)/cardio" as const,
}));
const mockStressHook = jest.fn(() => ({
  presence: "absent_no_day_evidence" as const,
  model: null,
  href: "/(app)/recovery/stress" as const,
  refetch: jest.fn(),
}));

jest.mock("@/lib/data/dash/useDailyMonitorActivityCard", () => ({
  useDailyMonitorActivityCard: (...args: unknown[]) => mockActivityHook(...args),
}));
jest.mock("@/lib/data/dash/useDailyMonitorSessionCards", () => ({
  useDailyMonitorSessionCards: (...args: unknown[]) => mockSessionHook(...args),
}));
jest.mock("@/lib/data/dash/useDailyMonitorStressCard", () => ({
  useDailyMonitorStressCard: (...args: unknown[]) => mockStressHook(...args),
}));

jest.mock("@/lib/ui/navigation/useFloatingTabBarScrollPadding", () => ({
  useFloatingTabBarScrollPadding: () => 120,
}));

jest.mock("@/components/navigation/ManageNavigationContext", () => ({
  useManageNavigation: () => ({
    manageVisible: false,
    menuAnchor: null,
    openManage: jest.fn(),
    closeManage: jest.fn(),
  }),
}));

jest.mock("@/lib/data/profile/useUserProfileMain", () => ({
  useUserProfileMain: () => ({ state: { status: "missing" } }),
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn() }),
  useFocusEffect: (cb: () => void | (() => void)) => {
    cb();
  },
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { DailyMonitorHost } = require("../DailyMonitorHost");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { LegacyDashHost } = require("../LegacyDashHost");

function collectText(root: renderer.ReactTestInstance): string {
  return root
    .findAllByType("Text")
    .map((n) =>
      (n.children as (string | number)[])
        .filter((c) => typeof c === "string" || typeof c === "number")
        .join(""),
    )
    .join(" | ");
}

describe("Daily Monitor header hierarchy", () => {
  beforeEach(() => {
    mockActivityHook.mockClear();
    mockSessionHook.mockClear();
    mockStressHook.mockClear();
  });

  it("uses Oli in the fixed header and Daily Monitor + date in page content", async () => {
    allowConsoleForThisTest({ error: [/not wrapped in act/] });
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(React.createElement(DailyMonitorHost));
      await Promise.resolve();
    });

    const header = tree.root.findByProps({ testID: "dash-screen-header" });
    expect(header.props.accessibilityLabel).toBe(DAILY_MONITOR_APP_HEADER_TITLE);
    expect(DAILY_MONITOR_APP_HEADER_TITLE).toBe("Oli");

    const pageTitle = tree.root.findByProps({ testID: "daily-monitor-page-title" });
    expect(pageTitle.props.children).toBe(DAILY_MONITOR_SCREEN_TITLE);
    expect(pageTitle.props.accessibilityRole).toBe("header");
    const pageDate = tree.root.findByProps({ testID: "daily-monitor-page-date" });
    expect(pageDate.props.children).toBe("Mon Jul 20, 2026");
    expect(pageDate.props.accessibilityRole).toBe("text");

    const text = collectText(tree.root);
    expect(text).toContain("Oli");
    expect(text).toContain("Daily Monitor");
    expect(text).toContain("Mon Jul 20, 2026");

    const headerTitle = header.findAll(
      (n) =>
        n.type === "Text" &&
        (n.props as { accessibilityRole?: string }).accessibilityRole === "header",
    );
    expect(headerTitle).toHaveLength(1);
    expect(
      (headerTitle[0]!.children as (string | number)[])
        .filter((c) => typeof c === "string" || typeof c === "number")
        .join(""),
    ).toBe("Oli");
    expect(header.findAllByProps({ testID: "daily-monitor-page-title" })).toHaveLength(0);
    expect(header.findAllByProps({ testID: "daily-monitor-page-date" })).toHaveLength(0);
    const headerJoined = header
      .findAllByType("Text")
      .map((n) =>
        (n.children as (string | number)[])
          .filter((c) => typeof c === "string" || typeof c === "number")
          .join(""),
      )
      .join(" ");
    expect(headerJoined).not.toContain("Daily Monitor");
    expect(headerJoined).not.toContain("Mon Jul 20");

    expect(mockActivityHook).toHaveBeenCalled();
    expect(mockSessionHook).toHaveBeenCalled();
    expect(mockStressHook).toHaveBeenCalled();
    tree.unmount();
  });

  it("preserves legacy Oli Fitness header and does not mount Monitor-only domain hooks", async () => {
    allowConsoleForThisTest({ error: [/not wrapped in act/] });
    mockActivityHook.mockClear();
    mockSessionHook.mockClear();
    mockStressHook.mockClear();

    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(React.createElement(LegacyDashHost));
      await Promise.resolve();
    });

    const header = tree.root.findByProps({ testID: "dash-screen-header" });
    const headerTexts = header
      .findAllByType("Text")
      .map((n) =>
        (n.children as (string | number)[])
          .filter((c) => typeof c === "string" || typeof c === "number")
          .join(""),
      );
    expect(headerTexts).toContain(LEGACY_DASH_SCREEN_TITLE);
    expect(headerTexts.join(" ")).not.toContain("Daily Monitor");
    expect(tree.root.findAllByProps({ testID: "daily-monitor-page-title" })).toHaveLength(0);
    expect(mockActivityHook).not.toHaveBeenCalled();
    expect(mockSessionHook).not.toHaveBeenCalled();
    expect(mockStressHook).not.toHaveBeenCalled();
    tree.unmount();
  });
});
