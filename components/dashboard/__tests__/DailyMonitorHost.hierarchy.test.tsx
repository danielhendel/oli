/**
 * Today host: Plan-style page title + date + Daily Monitor (no compact app header).
 * Home host: Oli header + My Health & Performance cards (no Daily Monitor).
 */

import React, { act } from "react";
import renderer from "react-test-renderer";

import {
  CONSUMER_HOME_SCREEN_TITLE,
  CONSUMER_TODAY_LABEL,
  HOME_MY_HEALTH_PERFORMANCE_TITLE,
} from "@/lib/navigation/consumerHome";
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

jest.mock("@/lib/data/dash/useDailyMonitorRefresh", () => ({
  useDailyMonitorRefresh: () => ({
    refreshing: false,
    onRefresh: jest.fn(),
    refreshQuiet: jest.fn(),
  }),
}));

jest.mock("@/lib/ui/navigation/useFloatingTabBarScrollPadding", () => ({
  useFloatingTabBarScrollPadding: () => 80,
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useFocusEffect: (cb: () => void) => {
    cb();
  },
  usePathname: () => "/today",
}));

jest.mock("@/lib/data/profile/useUserProfileMain", () => ({
  useUserProfileMain: () => ({
    state: {
      status: "ready",
      profile: {
        identity: { firstName: "Sam", lastName: null, dateOfBirth: null, sexAtBirth: null },
      },
    },
  }),
}));

function collectText(node: renderer.ReactTestInstance): string {
  const parts: string[] = [];
  const walk = (n: renderer.ReactTestInstance) => {
    if (typeof n === "string" || typeof n === "number") {
      parts.push(String(n));
      return;
    }
    if (n.children) {
      for (const c of n.children) {
        if (typeof c === "string" || typeof c === "number") parts.push(String(c));
        else if (c && typeof c === "object") walk(c as renderer.ReactTestInstance);
      }
    }
  };
  walk(node);
  return parts.join(" ");
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { DailyMonitorHost } = require("../DailyMonitorHost");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { HomeScreenContent } = require("@/lib/ui/home/HomeScreenContent");

describe("Home / Today separation", () => {
  beforeEach(() => {
    mockActivityHook.mockClear();
    mockSessionHook.mockClear();
    mockStressHook.mockClear();
  });

  it("Today host shows Plan-style page title, date, and no compact app header", async () => {
    allowConsoleForThisTest({ error: [/not wrapped in act/] });
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(React.createElement(DailyMonitorHost));
      await Promise.resolve();
    });

    expect(tree.root.findAllByProps({ testID: "app-header" })).toHaveLength(0);
    expect(tree.root.findAllByProps({ testID: "app-header-menu-button" })).toHaveLength(0);
    expect(tree.root.findAllByProps({ testID: "app-navigation-drawer" })).toHaveLength(0);

    const titleNodes = tree.root.findAll(
      (n) =>
        n.type === "Text" &&
        (n.props as { accessibilityRole?: string }).accessibilityRole === "header" &&
        String((n.children ?? []).join("")) === CONSUMER_TODAY_LABEL,
    );
    expect(titleNodes).toHaveLength(1);
    expect(titleNodes[0]!.props.style).toEqual(
      expect.objectContaining({
        fontSize: 22,
        fontWeight: "600",
      }),
    );

    const pageDate = tree.root.findByProps({ testID: "daily-monitor-page-date" });
    expect(pageDate.props.children).toBe("Mon Jul 20, 2026");
    expect(pageDate.props.accessibilityRole).toBe("text");

    expect(tree.root.findAllByProps({ testID: "home-my-health-performance" })).toHaveLength(0);
    const text = collectText(tree.root);
    expect(text).not.toContain(HOME_MY_HEALTH_PERFORMANCE_TITLE);
    expect(text).not.toContain("Where am I?");
    expect(text).not.toContain("Building your health picture");
    expect((text.match(/\bToday\b/g) ?? []).length).toBe(1);

    expect(mockActivityHook).toHaveBeenCalled();
    tree.unmount();
  });

  it("Home shows compact Oli header, stacked categories, and no Daily Monitor host", async () => {
    allowConsoleForThisTest({ error: [/not wrapped in act/] });
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(React.createElement(HomeScreenContent));
      await Promise.resolve();
    });

    const header = tree.root.findByProps({ testID: "app-header" });
    expect(header.props.accessibilityLabel).toBe(CONSUMER_HOME_SCREEN_TITLE);
    tree.root.findByProps({ testID: "app-header-menu-button" });

    const sectionTitle = tree.root.findByProps({ testID: "home-my-health-performance-title" });
    expect(sectionTitle.props.children).toBe(HOME_MY_HEALTH_PERFORMANCE_TITLE);

    for (const id of [
      "body_composition",
      "strength",
      "cardio_fitness",
      "nutrition",
      "sleep",
      "recovery",
      "health",
    ]) {
      tree.root.findByProps({ testID: `home-category-card-${id}` });
    }

    expect(tree.root.findAllByProps({ testID: "daily-monitor-host" })).toHaveLength(0);
    expect(tree.root.findAllByProps({ testID: "daily-monitor-page-date" })).toHaveLength(0);
    expect(mockActivityHook).not.toHaveBeenCalled();
    tree.unmount();
  });
});
