import React, { act } from "react";
import renderer from "react-test-renderer";

import { CONSUMER_TODAY_LABEL } from "@/lib/navigation/consumerHome";

jest.mock("@react-navigation/native", () => ({
  CommonActions: {
    navigate: jest.fn((opts: object) => ({ type: "NAVIGATE", payload: opts })),
  },
}));

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({ user: { uid: "t1" }, initializing: false, getIdToken: jest.fn() }),
}));

jest.mock("@/lib/data/profile/useUserProfileMain", () => ({
  useUserProfileMain: () => ({ state: { status: "missing" } }),
}));

jest.mock("@/lib/hooks/useCurrentLocalDayKey", () => ({
  useCurrentLocalDayKey: () => ({ dayKey: "2026-09-13", refreshDayKey: jest.fn() }),
}));

jest.mock("@/lib/ui/calendar/dayKeyDisplayFormat", () => ({
  formatDayKeyStackNavTitle: () => "Sun Sep 13, 2026",
}));

jest.mock("@/lib/hooks/useTodayHealthHero", () => ({
  useTodayHealthHero: () => ({
    energy: undefined,
    energyLoading: false,
    energyError: null,
    sleepCardVm: { status: "missing", day: "2026-09-13", message: "No sleep" },
    exactDayRestingHeartRateBpm: null,
    attributedSleepNight: null,
    attributedSleepResolution: null,
    refetch: jest.fn(),
    refetchSleep: jest.fn(),
  }),
}));

jest.mock("@/lib/hooks/useDailyReadinessCard", () => ({
  useDailyReadinessCard: () => ({
    vm: { status: "missing", day: "2026-09-13", message: "Waiting" },
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

jest.mock("@/lib/data/dash/useDailyMonitorActivityCard", () => ({
  useDailyMonitorActivityCard: () => ({
    presence: "absent_no_day_evidence",
    model: null,
    href: "/(app)/activity",
    refetch: jest.fn(),
  }),
}));
jest.mock("@/lib/data/dash/useDailyMonitorSessionCards", () => ({
  useDailyMonitorSessionCards: () => ({
    workoutPresence: "absent_no_day_evidence",
    workoutModel: null,
    workoutHref: "/(app)/workouts",
    cardioPresence: "absent_no_day_evidence",
    cardioModel: null,
    cardioHref: "/(app)/cardio",
  }),
}));
jest.mock("@/lib/data/dash/useDailyMonitorStressCard", () => ({
  useDailyMonitorStressCard: () => ({
    presence: "absent_no_day_evidence",
    model: null,
    href: "/(app)/recovery/stress",
    refetch: jest.fn(),
  }),
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
  usePathname: () => "/today",
  useFocusEffect: (cb: () => void) => {
    cb();
  },
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
  Modal: "Modal",
  ScrollView: "ScrollView",
  RefreshControl: "RefreshControl",
  ActivityIndicator: "ActivityIndicator",
  StyleSheet: { create: (s: unknown) => s, hairlineWidth: 1 },
  useWindowDimensions: () => ({ width: 390, height: 844 }),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const TodayScreen = require("../../../../app/(app)/(tabs)/today").default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ProgramScreen = require("../../../../app/(app)/(tabs)/program").default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { HomeScreenContent } = require("@/lib/ui/home/HomeScreenContent");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PRIMARY_NAVIGATION_ITEMS } = require("@/lib/navigation/primaryNavigationConfig");

function collectText(node: renderer.ReactTestInstance): string {
  const parts: string[] = [];
  const walk = (n: renderer.ReactTestInstance) => {
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

describe("Today Plan-style page heading", () => {
  it("uses large left-aligned Today title and date without compact header chrome", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(React.createElement(TodayScreen));
    });

    expect(tree.root.findAllByProps({ testID: "app-header" })).toHaveLength(0);
    expect(tree.root.findAllByProps({ testID: "app-header-menu-button" })).toHaveLength(0);
    expect(
      tree.root.findAll(
        (n) =>
          (n.props as { accessibilityLabel?: string }).accessibilityLabel === "Open navigation menu",
      ),
    ).toHaveLength(0);
    expect(
      tree.root.findAll(
        (n) => (n.props as { accessibilityLabel?: string }).accessibilityLabel === "Open settings",
      ),
    ).toHaveLength(0);

    const titles = tree.root.findAll(
      (n) =>
        n.type === "Text" &&
        (n.props as { accessibilityRole?: string }).accessibilityRole === "header" &&
        String((n.children ?? []).join("")) === CONSUMER_TODAY_LABEL,
    );
    expect(titles).toHaveLength(1);
    expect(titles[0]!.props.style).toEqual(
      expect.objectContaining({ fontSize: 22, fontWeight: "600" }),
    );

    const date = tree.root.findByProps({ testID: "daily-monitor-page-date" });
    expect(date.props.children).toBe("Sun Sep 13, 2026");
    expect(tree.root.findAllByProps({ testID: "daily-monitor-host" })).toHaveLength(1);
    expect(collectText(tree.root)).toMatch(/No health data is available for today yet/i);
  });

  it("Plan still uses the same title typography with What am I doing?", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(React.createElement(ProgramScreen));
    });
    const text = collectText(tree.root);
    expect(text).toContain("Plan");
    expect(text).toContain("What am I doing?");
    const planTitle = tree.root.findAll(
      (n) =>
        n.type === "Text" &&
        (n.props as { accessibilityRole?: string }).accessibilityRole === "header" &&
        String((n.children ?? []).join("")) === "Plan",
    );
    expect(planTitle).toHaveLength(1);
    expect(planTitle[0]!.props.style).toEqual(
      expect.objectContaining({ fontSize: 22, fontWeight: "600" }),
    );
  });

  it("Home keeps compact Oli header and hamburger", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(React.createElement(HomeScreenContent));
    });
    tree.root.findByProps({ testID: "app-header" });
    tree.root.findByProps({ testID: "app-header-menu-button" });
    const oli = tree.root.findAll(
      (n) =>
        n.type === "Text" &&
        (n.props as { accessibilityRole?: string }).accessibilityRole === "header" &&
        String((n.children ?? []).join("")) === "Oli",
    );
    expect(oli).toHaveLength(1);
  });

  it("primary navigation order remains five destinations with Today", () => {
    expect(PRIMARY_NAVIGATION_ITEMS.map((i: { label: string }) => i.label)).toEqual([
      "Home",
      "Today",
      "Plan",
      "Progress",
      "You",
    ]);
  });
});
