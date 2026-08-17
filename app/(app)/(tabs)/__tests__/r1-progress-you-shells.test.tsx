import React, { act } from "react";
import renderer from "react-test-renderer";
import fs from "node:fs";
import path from "node:path";

import {
  setDashWeeklyProgressRelocationEnabledForTests,
  WEEKLY_PROGRESS_CONSUMER_TITLE,
} from "@/lib/data/dash/dashWeeklyProgressRelocation";
import { ANALYTICS_FIRST_PROHIBITED_COPY } from "@/lib/navigation/consumerHome";
import { ACTIVITY_CONSUMER_LABEL } from "@/lib/navigation/domainPresentation";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("@/lib/ui/navigation/useFloatingTabBarScrollPadding", () => ({
  useFloatingTabBarScrollPadding: (extra: number) => extra + 0,
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

import ProgressScreen from "../progress";
import YouScreen from "../you";

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

describe("Progress tab", () => {
  beforeEach(() => {
    mockPush.mockClear();
    setDashWeeklyProgressRelocationEnabledForTests(true);
  });

  afterEach(() => {
    setDashWeeklyProgressRelocationEnabledForTests(null);
  });

  it("renders Weekly Progress once and does not duplicate Home copy", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<ProgressScreen />);
    });
    expect(test.root.findByProps({ testID: "progress-weekly-progress-section" })).toBeTruthy();
    const text = collectText(test);
    expect(text).toContain(WEEKLY_PROGRESS_CONSUMER_TITLE);
    expect(text).toContain("How am I changing?");
    expect(text).not.toContain("adherence");
    expect(text).not.toContain("What Oli Sees");
    for (const phrase of ANALYTICS_FIRST_PROHIBITED_COPY) {
      expect(text).not.toContain(phrase);
    }
  });

  it("keeps Timeline reachable", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<ProgressScreen />);
    });
    const timeline = test.root.findByProps({ testID: "progress-link-timeline" });
    act(() => {
      (timeline.props.onPress as () => void)();
    });
    expect(mockPush).toHaveBeenCalledWith("/(app)/(tabs)/timeline");
  });

  it("labels Activity history as Movement at the presentation layer", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<ProgressScreen />);
    });
    expect(collectText(test)).toContain(`${ACTIVITY_CONSUMER_LABEL} history`);
  });
});

describe("You tab", () => {
  it("exposes profile, devices, assessments, labs, privacy, settings, and failures", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<YouScreen />);
    });
    for (const id of [
      "you-hub-profile",
      "you-hub-devices",
      "you-hub-assessments",
      "you-hub-labs",
      "you-hub-privacy",
      "you-hub-settings",
      "you-hub-failures",
    ]) {
      expect(test.root.findByProps({ testID: id })).toBeTruthy();
    }
  });

  it("keeps Movement as the consumer label for Activity and one Nutrition supplements destination", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<YouScreen />);
    });
    const movement = test.root.findByProps({ testID: "you-hub-movement" });
    expect(movement.props.accessibilityLabel).toBe("Movement");
    act(() => {
      (movement.props.onPress as () => void)();
    });
    expect(mockPush).toHaveBeenCalledWith("/(app)/activity");
    const supplements = test.root.findByProps({ testID: "you-hub-supplements" });
    act(() => {
      (supplements.props.onPress as () => void)();
    });
    expect(mockPush).toHaveBeenCalledWith("/(app)/nutrition/supplements");
  });

  it("does not present Health placeholder products as launch-ready", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<YouScreen />);
    });
    const text = collectText(test);
    expect(text).not.toContain("DNA");
    expect(text).not.toContain("Medical History");
    expect(text).not.toContain("Scans");
    expect(text).not.toContain("Medication");
    expect(text).not.toContain("Coming soon");
  });

  it("does not add Firebase to the You route", () => {
    const src = fs.readFileSync(path.join(__dirname, "..", "you.tsx"), "utf8");
    expect(src).not.toMatch(/from\s+["'][^"']*firebase[^"']*["']/i);
  });
});
