import React, { act } from "react";
import fs from "node:fs";
import path from "node:path";
import renderer from "react-test-renderer";

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

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({ user: { uid: "t1" }, initializing: false, getIdToken: jest.fn() }),
}));

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  StyleSheet: { create: (s: unknown) => s, hairlineWidth: 1 },
}));

import ProgramScreen from "../program";
import { ANALYTICS_FIRST_PROHIBITED_COPY } from "@/lib/navigation/consumerHome";

beforeEach(() => {
  mockPush.mockClear();
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

describe("Plan tab", () => {
  it("renders the Plan header title", () => {
    const test = renderProgram();
    const text = collectText(test);
    expect(text).toContain("Plan");
    expect(text).toContain("What am I doing?");
    expect(text).not.toContain("My Plan");
  });

  it("does not mount Weekly Progress on Plan", () => {
    const test = renderProgram();
    expect(
      test.root.findAll(
        (n) => (n.props as { testID?: string }).testID === "program-weekly-progress-section",
      ),
    ).toHaveLength(0);
  });

  it("does not render a launch-facing builder + control", () => {
    const test = renderProgram();
    expect(
      test.root.findAll((n) => (n.props as { testID?: string }).testID === "program-add-button"),
    ).toHaveLength(0);
  });

  it("does not render placeholder builder cards", () => {
    const test = renderProgram();
    const str = JSON.stringify(test.toJSON());
    expect(str).not.toContain("Builders");
    expect(str).not.toContain("Workout Builder");
    expect(str).not.toContain("Cardio Builder");
    expect(str).not.toContain("program-category-cards");
  });

  it("renders an honest empty state when no current plan exists", () => {
    const test = renderProgram();
    expect(test.root.findByProps({ testID: "program-current-empty" })).toBeTruthy();
    const text = collectText(test);
    expect(text).toContain("No active plan");
    expect(text).toContain("Plans created by you or provided by a professional will appear here.");
    expect(text).not.toContain("Saved Programs");
    for (const phrase of ANALYTICS_FIRST_PROHIBITED_COPY) {
      expect(text).not.toContain(phrase);
    }
  });

  it("does not add Firebase or raw HTTP/API calls to the Plan route", () => {
    const routePath = path.join(__dirname, "..", "program.tsx");
    const src = fs.readFileSync(routePath, "utf8");
    expect(src).not.toMatch(/\bfetch\s*\(/);
    expect(src).not.toMatch(/from\s+["'][^"']*firebase[^"']*["']/i);
    expect(src).not.toMatch(/from\s+["'][^"']*lib\/api\/http["']/);
    expect(src).not.toMatch(/apiGet[A-Za-z]*\s*\(/);
  });
});
