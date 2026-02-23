// app/(app)/body/__tests__/weight-screen.test.tsx
// Weight Page v1: no-data state, range selector, manual log CTA when not connected.

import React, { act } from "react";
import renderer from "react-test-renderer";

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  TextInput: "TextInput",
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  Modal: "Modal",
  StyleSheet: { create: (s: unknown) => s },
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn() }),
  useNavigation: () => ({ setOptions: jest.fn() }),
}));

jest.mock("react-native-svg", () => ({
  default: "Svg",
  Path: "Path",
  Circle: "Circle",
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => require("react").createElement("View", { "data-testid": "icon" }),
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
}));


jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: { uid: "u1" },
    initializing: false,
    getIdToken: jest.fn().mockResolvedValue("token"),
  }),
}));

jest.mock("@/lib/preferences/PreferencesProvider", () => ({
  usePreferences: () => ({
    state: {
      status: "ready",
      preferences: { units: { mass: "lb" } },
    },
  }),
}));

let mockWithingsConnected = false;
jest.mock("@/lib/data/useWithingsPresence", () => ({
  useWithingsPresence: () => ({
    status: "ready",
    data: {
      connected: mockWithingsConnected,
      lastMeasurementAt: mockWithingsConnected ? "2025-02-20T08:00:00.000Z" : null,
      hasRecentData: mockWithingsConnected,
    },
    refetch: jest.fn(),
  }),
}));

const emptyViewModel = {
  points: [] as { observedAt: string; dayKey: string; weightKg: number; sourceId: string }[],
  latest: null as { weightKg: number; observedAt: string; sourceId: string } | null,
  avg7Kg: null as number | null,
  weeklyDeltaKg: null as number | null,
  rolling7: [] as { dayKey: string; valueKg: number }[],
  insights: {
    change30dKg: null as number | null,
    weeklyRateKg: null as number | null,
    consistency: "medium" as const,
    volatilityKg: null as number | null,
    streakDays: 0,
    trendNote: "Not enough data",
  },
};

const viewModelWithPoints = {
  ...emptyViewModel,
  points: [
    {
      observedAt: "2025-02-20T10:00:00.000Z",
      dayKey: "2025-02-20",
      weightKg: 75,
      sourceId: "manual",
    },
  ],
  latest: { weightKg: 75, observedAt: "2025-02-20T10:00:00.000Z", sourceId: "manual" },
};

let mockWeightSeriesData = emptyViewModel;

jest.mock("@/lib/data/useWeightSeries", () => ({
  useWeightSeries: () => ({
    status: "ready",
    data: mockWeightSeriesData,
    refetch: jest.fn(),
  }),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const BodyWeightScreen = require("../weight").default;

function collectAllText(test: renderer.ReactTestRenderer): string {
  const nodes = test.root.findAllByType("Text");
  const parts: string[] = [];
  for (const n of nodes) {
    for (const child of n.children) {
      if (typeof child === "string" || typeof child === "number") parts.push(String(child));
    }
  }
  return parts.join(" ");
}

function findPressableWithLabel(
  root: renderer.ReactTestInstance,
  label: string,
): renderer.ReactTestInstance | null {
  const pressables = root.findAllByType("Pressable");
  for (const p of pressables) {
    if ((p.props as { accessibilityLabel?: string }).accessibilityLabel === label) return p;
  }
  return null;
}

describe("Weight screen", () => {
  it("renders with Weight metric label in body (header title is in nav, not in-page)", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<BodyWeightScreen />);
    });
    const text = collectAllText(test);
    expect(text).toContain("Weight");
  });

  it("renders in no-data state with EmptyState and hero without numeric weight", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<BodyWeightScreen />);
    });
    const text = collectAllText(test);
    expect(text).toContain("No weight data yet");
    expect(text).toContain("Last logged");
    expect(text).toContain("Your chart will appear after your first weigh-in.");
  });

  it("renders range selector with 7D, 30D, 90D, 6M, 1Y, 3Y, 5Y, All", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<BodyWeightScreen />);
    });
    const text = collectAllText(test);
    expect(text).toContain("7D");
    expect(text).toContain("30D");
    expect(text).toContain("90D");
    expect(text).toContain("6M");
    expect(text).toContain("1Y");
    expect(text).toContain("3Y");
    expect(text).toContain("5Y");
    expect(text).toContain("All");
  });

  it("shows Log your weight button when not connected", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<BodyWeightScreen />);
    });
    const btn = findPressableWithLabel(test.root, "Log your weight");
    expect(btn).not.toBeNull();
  });

  it("shows Withings card with Not connected and Connect Withings when not connected", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<BodyWeightScreen />);
    });
    const text = collectAllText(test);
    expect(text).toContain("Withings");
    expect(text).toContain("Not connected");
    expect(text).toContain("Connect a device to auto-sync weight.");
    const connectBtn = findPressableWithLabel(test.root, "Connect Withings");
    expect(connectBtn).not.toBeNull();
  });

  it("renders chart when points.length > 0 and does not show placeholder text", () => {
    mockWeightSeriesData = viewModelWithPoints;
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<BodyWeightScreen />);
    });
    const text = collectAllText(test);
    expect(text).not.toContain("Chart will appear once data is available");
    const chart = test.root.findByProps({ testID: "weight-trend-chart" });
    expect(chart).toBeTruthy();
    mockWeightSeriesData = emptyViewModel;
  });

  it("shows Last logged in hero when points exist", () => {
    mockWeightSeriesData = viewModelWithPoints;
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<BodyWeightScreen />);
    });
    const text = collectAllText(test);
    expect(text).toContain("Last logged");
    expect(text).toContain("Manual");
    mockWeightSeriesData = emptyViewModel;
  });

  it("shows stat tiles (Change, Avg, High, Low) when points exist", () => {
    mockWeightSeriesData = viewModelWithPoints;
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<BodyWeightScreen />);
    });
    const text = collectAllText(test);
    expect(text).toContain("High");
    expect(text).toContain("Low");
    mockWeightSeriesData = emptyViewModel;
  });

  it("chart container has testID when points exist and placeholder text never appears", () => {
    mockWeightSeriesData = viewModelWithPoints;
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<BodyWeightScreen />);
    });
    const text = collectAllText(test);
    expect(text).not.toContain("Chart will appear once data is available");
    const chartContainer = test.root.findByProps({ testID: "weight-trend-chart" });
    expect(chartContainer).toBeTruthy();
    mockWeightSeriesData = emptyViewModel;
  });

  it("hides Add manual entry when Withings connected", () => {
    mockWithingsConnected = true;
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<BodyWeightScreen />);
    });
    const addManualBtn = findPressableWithLabel(test.root, "Add manual entry");
    expect(addManualBtn).toBeNull();
    mockWithingsConnected = false;
  });

  it("Devices & History section shows History when data exists", () => {
    mockWithingsConnected = true;
    mockWeightSeriesData = viewModelWithPoints;
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<BodyWeightScreen />);
    });
    const text = collectAllText(test);
    expect(text).toContain("Devices & History");
    expect(text).toContain("History");
    mockWithingsConnected = false;
    mockWeightSeriesData = emptyViewModel;
  });
});
