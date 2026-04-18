import React from "react";
import renderer, { act } from "react-test-renderer";

const mockSetOptions = jest.fn();
const mockGoBack = jest.fn();

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ day: "2026-04-14" }),
  usePathname: () => "/activity/day/2026-04-14",
  useNavigation: () => ({
    setOptions: mockSetOptions,
    goBack: mockGoBack,
  }),
}));

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: { uid: "u1" },
    initializing: false,
  }),
}));

jest.mock("@/lib/data/activity/useActivityDayScreenData", () => ({
  useActivityDayScreenData: () => ({
    normalized: { ok: true as const, day: "2026-04-14" },
    state: { status: "ready" as const, steps: 9021 },
    reload: jest.fn(),
  }),
}));

import ActivityDayScreen from "../day/[day]";

describe("ActivityDayScreen", () => {
  beforeEach(() => {
    mockSetOptions.mockClear();
  });

  it("sets native header with centered formatted date and back affordance", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<ActivityDayScreen />);
    });
    expect(mockSetOptions).toHaveBeenCalled();
    const lastCall = mockSetOptions.mock.calls[mockSetOptions.mock.calls.length - 1]![0] as {
      title?: string;
      headerTitleAlign?: string;
      headerLeft?: () => unknown;
    };
    expect(lastCall.headerTitleAlign).toBe("center");
    expect(lastCall.title).toMatch(/Apr/);
    expect(lastCall.title).toMatch(/14/);
    expect(lastCall.title).toMatch(/2026/);
    expect(typeof lastCall.headerLeft).toBe("function");

    const str = JSON.stringify(tree.toJSON());
    expect(str).toContain("9,021");
  });
});
