import React, { act } from "react";
import fs from "node:fs";
import path from "node:path";
import renderer from "react-test-renderer";

import {
  setDashWeeklyProgressRelocationEnabledForTests,
  WEEKLY_PROGRESS_CONSUMER_TITLE,
  WEEKLY_PROGRESS_SUPPORTING_COPY,
} from "@/lib/data/dash/dashWeeklyProgressRelocation";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
}));

jest.mock("@/lib/ui/navigation/useFloatingTabBarScrollPadding", () => ({
  useFloatingTabBarScrollPadding: (extra: number) => extra + 0,
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

jest.mock("@/lib/preferences/PreferencesProvider", () => ({
  usePreferences: () => ({
    state: { preferences: {} },
  }),
}));

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({ user: { uid: "t1" }, initializing: false, getIdToken: jest.fn() }),
}));

jest.mock("@/lib/data/dash/useWeeklyFitnessCard", () => ({
  useWeeklyFitnessCard: () => ({
    loading: false,
    error: null,
    model: null,
    goalsHref: "/(app)/fitness-goals",
  }),
}));

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  StyleSheet: { create: (s: unknown) => s, hairlineWidth: 1 },
}));

jest.mock("react-native-svg", () => ({
  __esModule: true,
  default: "Svg",
  Circle: "Circle",
}));

import ProgramScreen from "../program";

beforeEach(() => {
  mockPush.mockClear();
  setDashWeeklyProgressRelocationEnabledForTests(true);
});

afterEach(() => {
  setDashWeeklyProgressRelocationEnabledForTests(null);
});

function renderProgram(): renderer.ReactTestRenderer {
  let test!: renderer.ReactTestRenderer;
  act(() => {
    test = renderer.create(<ProgramScreen />);
  });
  return test;
}

function collectText(test: renderer.ReactTestRenderer): string {
  const nodes = test.root.findAllByType("Text");
  const parts: string[] = [];
  for (const n of nodes) {
    for (const child of n.children) {
      if (typeof child === "string" || typeof child === "number") parts.push(String(child));
    }
  }
  return parts.join(" ");
}

describe("Program tab", () => {
  it("renders the Program header title", () => {
    const test = renderProgram();
    const str = JSON.stringify(test.toJSON());
    expect(str).toContain("Program");
  });

  it("renders Weekly Progress when relocation is enabled", () => {
    const test = renderProgram();
    const text = collectText(test);
    expect(text).toContain(WEEKLY_PROGRESS_CONSUMER_TITLE);
    expect(text).toContain(WEEKLY_PROGRESS_SUPPORTING_COPY);
    expect(test.root.findByProps({ testID: "program-weekly-progress-section" })).toBeTruthy();
    expect(text).not.toMatch(/adherence/i);
    expect(text).not.toMatch(/health score/i);
  });

  it("omits Weekly Progress when relocation is disabled", () => {
    setDashWeeklyProgressRelocationEnabledForTests(false);
    const test = renderProgram();
    const text = collectText(test);
    expect(text).not.toContain(WEEKLY_PROGRESS_CONSUMER_TITLE);
    expect(
      test.root.findAll(
        (n) => (n.props as { testID?: string }).testID === "program-weekly-progress-section",
      ),
    ).toHaveLength(0);
  });

  it("does not render the Program Builder + button", () => {
    const test = renderProgram();
    expect(
      test.root.findAll((n) => (n.props as { testID?: string }).testID === "program-add-button"),
    ).toHaveLength(0);
  });

  it("links to the real workout builder without placeholder builder grid", () => {
    const test = renderProgram();
    const link = test.root.findByProps({ testID: "program-workout-builder-link" });
    act(() => {
      (link.props.onPress as () => void)();
    });
    expect(mockPush).toHaveBeenCalledWith("/(app)/program/workout");
    const str = JSON.stringify(test.toJSON());
    expect(str).not.toContain("Cardio Builder");
    expect(str).not.toContain("Nutrition Builder");
    expect(str).not.toContain("Recovery Builder");
    expect(str).not.toContain("Coming soon");
  });

  it("does not render the Design your plan category cards", () => {
    const test = renderProgram();
    expect(
      test.root.findAll((n) => (n.props as { testID?: string }).testID === "program-category-cards"),
    ).toHaveLength(0);
  });

  it("does not render the Builders section or builder cards", () => {
    const test = renderProgram();
    const str = JSON.stringify(test.toJSON());
    expect(str).not.toContain("Builders");
    expect(str).not.toContain("ACTIVE PROGRAM");
    expect(str).not.toContain("program-builder-card-workout");
  });

  it("renders the empty state when no current programs exist alongside Weekly Progress", () => {
    const test = renderProgram();
    expect(test.root.findByProps({ testID: "program-current-empty" })).toBeTruthy();
    const str = JSON.stringify(test.toJSON());
    expect(str).toContain("No active programs yet");
    expect(str).toContain(WEEKLY_PROGRESS_CONSUMER_TITLE);
    expect(str).not.toContain("Saved Programs");
    expect(str).not.toContain("Shared Programs");
    expect(str).not.toContain("Tap +");
  });

  it("does not add Firebase or raw HTTP/API calls to the Program route", () => {
    const routePath = path.join(__dirname, "..", "program.tsx");
    const src = fs.readFileSync(routePath, "utf8");
    expect(src).not.toMatch(/\bfetch\s*\(/);
    expect(src).not.toMatch(/from\s+["'][^"']*firebase[^"']*["']/i);
    expect(src).not.toMatch(/from\s+["'][^"']*lib\/api\/http["']/);
    expect(src).not.toMatch(/apiGet[A-Za-z]*\s*\(/);
    expect(src).not.toContain("useWeeklyFitnessCard");
  });
});
