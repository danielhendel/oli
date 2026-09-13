/**
 * Home tab provenance: domain map shell (no Daily Energy / legacy Dash composition).
 */

import React, { act } from "react";
import renderer from "react-test-renderer";

import { allowConsoleForThisTest } from "../../../../scripts/test/consoleGuard";

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: { uid: "u1", displayName: "Sam", email: "s@example.com" },
    initializing: false,
    getIdToken: jest.fn(async () => "token"),
  }),
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

jest.mock("@/lib/ui/navigation/useFloatingTabBarScrollPadding", () => ({
  useFloatingTabBarScrollPadding: () => 80,
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => "/dash",
  useFocusEffect: () => undefined,
}));

jest.mock("@/lib/ui/ScreenStates", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const R = require("react");
  return {
    ScreenContainer: ({ children }: { children: unknown }) =>
      R.createElement(R.Fragment, null, children),
  };
});

function collectAllText(test: renderer.ReactTestRenderer): string {
  const parts: string[] = [];
  const walk = (n: renderer.ReactTestInstance | string | number) => {
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
  walk(test.root);
  return parts.join(" ");
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const DashScreen = require("../dash").default;

describe("Dash / Home provenance", () => {
  it("shows Oli header, hamburger, and My Health & Performance cards", () => {
    allowConsoleForThisTest({ error: [/not wrapped in act/] });
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<DashScreen />);
    });
    const text = collectAllText(test);
    expect(text).toContain("Oli");
    expect(text).toContain("My Health & Performance");
    expect(text).toContain("Body Composition");
    expect(text).toContain("Cardio Fitness");
    expect(text).not.toContain("Where am I?");
    expect(text).not.toContain("Daily Energy");
    expect(text).not.toContain("Building your health picture");
    expect(test.root.findByProps({ testID: "app-header-menu-button" })).toBeTruthy();
    expect(test.root.findByProps({ testID: "user-initial-settings-button" })).toBeTruthy();
    expect(test.root.findAllByProps({ testID: "daily-monitor-host" }).length).toBe(0);
  });
});
