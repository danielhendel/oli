import React, { act } from "react";
import fs from "node:fs";
import path from "node:path";
import renderer from "react-test-renderer";

const mockPush = jest.fn();
const mockSetOptions = jest.fn();
const mockGoBack = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
  useNavigation: () => ({
    setOptions: mockSetOptions,
    goBack: mockGoBack,
  }),
}));

jest.mock("@/lib/ui/navigation/useFloatingTabBarScrollPadding", () => ({
  useFloatingTabBarScrollPadding: (extra: number) => extra + 0,
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

import ProgramBuilderHubRoute from "../builder";

beforeEach(() => {
  mockPush.mockClear();
  mockSetOptions.mockClear();
});

function renderHub(): renderer.ReactTestRenderer {
  let test!: renderer.ReactTestRenderer;
  act(() => {
    test = renderer.create(<ProgramBuilderHubRoute />);
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

describe("Program Builder hub", () => {
  it("applies the Activity-style stack header with left-aligned title", () => {
    renderHub();
    expect(mockSetOptions).toHaveBeenCalled();
    const options = mockSetOptions.mock.calls[mockSetOptions.mock.calls.length - 1]![0] as Record<
      string,
      unknown
    >;
    expect(options.title).toBe("Program Builder");
    expect(options.headerTitleAlign).toBe("left");
    expect(typeof options.headerLeft).toBe("function");
  });

  it("renders all four builder cards in order", () => {
    const test = renderHub();
    const cards = collectByTestIdPrefix(test, "program-builder-card-");
    expect(cards.map((c) => c.props.testID as string)).toEqual([
      "program-builder-card-workout",
      "program-builder-card-cardio",
      "program-builder-card-nutrition",
      "program-builder-card-recovery",
    ]);
    const str = JSON.stringify(test.toJSON());
    const order = ["Workout Builder", "Cardio Builder", "Nutrition Builder", "Recovery Builder"];
    const indices = order.map((label) => str.indexOf(label));
    expect(indices.every((i) => i >= 0)).toBe(true);
    expect(indices).toEqual([...indices].sort((a, b) => a - b));
  });

  it("navigates each builder card to its route", () => {
    const test = renderHub();
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

  it("does not add Firebase or raw HTTP/API calls to the builder route", () => {
    const routePath = path.join(__dirname, "..", "builder.tsx");
    const src = fs.readFileSync(routePath, "utf8");
    expect(src).not.toMatch(/\bfetch\s*\(/);
    expect(src).not.toMatch(/from\s+["'][^"']*firebase[^"']*["']/i);
    expect(src).not.toMatch(/from\s+["'][^"']*lib\/api\/http["']/);
    expect(src).not.toMatch(/apiGet[A-Za-z]*\s*\(/);
  });
});
