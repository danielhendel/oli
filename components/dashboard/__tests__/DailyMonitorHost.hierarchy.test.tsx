/**
 * Mode A header hierarchy: fixed header is Home; Today title/date live in scroll content.
 */

import React, { act } from "react";
import renderer from "react-test-renderer";

import {
  CONSUMER_HOME_SCREEN_TITLE,
  HOME_MY_HEALTH_PERFORMANCE_TITLE,
  HOME_TODAY_SECTION_TITLE,
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

  it("uses Oli header, My Health & Performance first, then Today", async () => {
    allowConsoleForThisTest({ error: [/not wrapped in act/] });
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(React.createElement(DailyMonitorHost));
      await Promise.resolve();
    });

    const header = tree.root.findByProps({ testID: "dash-screen-header" });
    expect(header.props.accessibilityLabel).toBe(CONSUMER_HOME_SCREEN_TITLE);

    const pageTitle = tree.root.findByProps({ testID: "daily-monitor-page-title" });
    expect(pageTitle.props.children).toBe(HOME_TODAY_SECTION_TITLE);
    expect(pageTitle.props.accessibilityRole).toBe("header");
    const pageDate = tree.root.findByProps({ testID: "daily-monitor-page-date" });
    expect(pageDate.props.children).toBe("Mon Jul 20, 2026");
    expect(pageDate.props.accessibilityRole).toBe("text");

    const sectionTitle = tree.root.findByProps({ testID: "home-my-health-performance-title" });
    expect(sectionTitle.props.children).toBe(HOME_MY_HEALTH_PERFORMANCE_TITLE);
    expect(sectionTitle.props.accessibilityRole).toBe("header");

    const text = collectText(tree.root);
    expect(text).toContain("Oli");
    expect(text).toContain(HOME_MY_HEALTH_PERFORMANCE_TITLE);
    expect(text).toContain("Body Composition");
    expect(text).toContain("Strength");
    expect(text).toContain("Cardio Fitness");
    expect(text).toContain("Nutrition");
    expect(text).toContain("Sleep");
    expect(text).toContain("Recovery");
    expect(text).toContain("Health");
    expect(text).toContain("Today");
    expect(text).not.toContain("Your Health & Performance");
    expect(text).not.toContain("Building your health picture");
    expect(text).not.toContain("Connect data or add information to begin establishing your baseline.");
    expect(text).not.toContain("Where am I?");
    expect(text).not.toContain("What Oli Sees");
    expect(text).not.toMatch(/overall score/i);
    expect(text).toContain("Mon Jul 20, 2026");
    // Movement must not appear as a primary Home category card label.
    expect(tree.root.findAllByProps({ testID: "home-category-card-activity" })).toHaveLength(0);

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
    expect(headerJoined).not.toContain("Today");
    expect(headerJoined).not.toContain("Where am I?");
    expect(headerJoined).not.toContain("Home");
    expect(headerJoined).not.toContain("Mon Jul 20");

    const categoryIds = [
      "body_composition",
      "strength",
      "cardio_fitness",
      "nutrition",
      "sleep",
      "recovery",
      "health",
    ];
    const categoryCards = categoryIds.map((id) =>
      tree.root.findByProps({ testID: `home-category-card-${id}` }),
    );
    expect(categoryCards).toHaveLength(7);
    expect(tree.root.findAllByProps({ testID: "home-category-card-activity" })).toHaveLength(0);

    const sectionNode = tree.root.findByProps({ testID: "home-my-health-performance" });
    const todayTitle = tree.root.findByProps({ testID: "daily-monitor-page-title" });
    expect(sectionNode).toBeTruthy();
    expect(todayTitle).toBeTruthy();

    expect(mockActivityHook).toHaveBeenCalled();
    expect(mockSessionHook).toHaveBeenCalled();
    expect(mockStressHook).toHaveBeenCalled();
    tree.unmount();
  });

  it("preserves Oli header on the legacy host and does not mount Monitor-only domain hooks", async () => {
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
    expect(headerTexts).toContain(CONSUMER_HOME_SCREEN_TITLE);
    expect(headerTexts.join(" ")).not.toContain("Daily Monitor");
    expect(headerTexts.join(" ")).not.toContain("Where am I?");
    expect(tree.root.findAllByProps({ testID: "daily-monitor-page-title" })).toHaveLength(0);
    expect(mockActivityHook).not.toHaveBeenCalled();
    expect(mockSessionHook).not.toHaveBeenCalled();
    expect(mockStressHook).not.toHaveBeenCalled();
    tree.unmount();
  });
});
