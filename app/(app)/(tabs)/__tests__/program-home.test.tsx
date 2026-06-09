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

jest.mock("@/lib/ui/SettingsGearButton", () => ({
  SettingsGearButton: () => null,
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

import ProgramScreen from "../program";

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

function collectByTestIdPrefix(
  test: renderer.ReactTestRenderer,
  prefix: string,
): renderer.ReactTestInstance[] {
  return test.root.findAll(
    (node) =>
      typeof node.type === "string" &&
      typeof node.props?.testID === "string" &&
      node.props.testID.startsWith(prefix),
  );
}

describe("Program Home screen", () => {
  it("renders the Program header title", () => {
    const test = renderProgram();
    const str = JSON.stringify(test.toJSON());
    expect(str).toContain("Program");
  });

  it("renders the Active Program card with the create CTA", () => {
    const test = renderProgram();
    const str = JSON.stringify(test.toJSON());
    expect(str).toContain("ACTIVE PROGRAM");
    expect(str).toContain("No active program");

    const cta = test.root.findByProps({ testID: "program-create-cta" });
    expect(cta).toBeTruthy();
    expect(JSON.stringify(test.toJSON())).toContain("Create Program");
  });

  it("renders the four builder cards in order (Workout, Cardio, Nutrition, Recovery)", () => {
    const test = renderProgram();
    const cards = collectByTestIdPrefix(test, "program-builder-card-");
    const ids = cards.map((c) => c.props.testID as string);
    expect(ids).toEqual([
      "program-builder-card-workout",
      "program-builder-card-cardio",
      "program-builder-card-nutrition",
      "program-builder-card-recovery",
    ]);

    const str = JSON.stringify(test.toJSON());
    const order = ["Workout Builder", "Cardio Builder", "Nutrition Builder", "Recovery Builder"];
    const indices = order.map((label) => str.indexOf(label));
    expect(indices.every((i) => i >= 0)).toBe(true);
    const sorted = [...indices].sort((a, b) => a - b);
    expect(indices).toEqual(sorted);
  });

  it("renders Saved Programs and Shared Programs empty states", () => {
    const test = renderProgram();
    const str = JSON.stringify(test.toJSON());
    expect(str).toContain("Saved Programs");
    expect(str).toContain("No saved programs yet");
    expect(str).toContain("Shared Programs");
    expect(str).toContain("No shared programs yet");
  });

  it("builder cards are enabled with accessible 'Open …' labels", () => {
    const test = renderProgram();
    const cards = collectByTestIdPrefix(test, "program-builder-card-");
    expect(cards).toHaveLength(4);
    for (const card of cards) {
      expect(card.props.accessibilityRole).toBe("button");
      expect(card.props.accessibilityState).toEqual({ disabled: false });
    }
    const str = JSON.stringify(test.toJSON());
    expect(str).toContain("Open Workout Builder");
    expect(str).toContain("Open Cardio Builder");
    expect(str).toContain("Open Nutrition Builder");
    expect(str).toContain("Open Recovery Builder");
  });

  it("navigates each builder card to its route", () => {
    const test = renderProgram();
    const expected: Record<string, string> = {
      "program-builder-card-workout": "/(app)/program/workout",
      "program-builder-card-cardio": "/(app)/program/cardio",
      "program-builder-card-nutrition": "/(app)/program/nutrition",
      "program-builder-card-recovery": "/(app)/program/recovery",
    };
    for (const [testID, href] of Object.entries(expected)) {
      mockPush.mockClear();
      const pressables = test.root.findAll(
        (node) => node.props?.testID === testID && typeof node.props?.onPress === "function",
      );
      expect(pressables.length).toBeGreaterThan(0);
      act(() => {
        (pressables[0]!.props.onPress as () => void)();
      });
      expect(mockPush).toHaveBeenCalledWith(href);
    }
  });

  it("does not add Firebase or raw HTTP/API calls to the Program route", () => {
    const routePath = path.join(__dirname, "..", "program.tsx");
    const src = fs.readFileSync(routePath, "utf8");
    expect(src).not.toMatch(/\bfetch\s*\(/);
    expect(src).not.toMatch(/from\s+["'][^"']*firebase[^"']*["']/i);
    expect(src).not.toMatch(/from\s+["'][^"']*lib\/api\/http["']/);
    expect(src).not.toMatch(/apiGet[A-Za-z]*\s*\(/);
  });
});
