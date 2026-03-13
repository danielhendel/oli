/**
 * Devices list — integration status display.
 * Verifies screen renders; status flow fixes (refetch on focus, Apple Health try/catch, Withings error state) are in implementation.
 */
import React from "react";
import { act } from "react";
import renderer from "react-test-renderer";
import { allowConsoleForThisTest } from "../../../../../scripts/test/consoleGuard";
import DevicesScreen from "../../devices";

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  StyleSheet: { create: (s: unknown) => s },
}));

jest.mock("@react-navigation/native", () => ({
  useFocusEffect: (cb: () => void) => {
    if (typeof cb === "function") cb();
  },
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: { uid: "u1" },
    getIdToken: async () => "token",
  }),
}));

jest.mock("@/lib/data/useWithingsPresence", () => ({
  useWithingsPresence: () => ({
    status: "ready",
    data: { connected: true, lastMeasurementAt: null, hasRecentData: false },
    refetch: jest.fn(),
  }),
}));

jest.mock("@/lib/data/useOuraPresence", () => ({
  useOuraPresence: () => ({
    status: "ready",
    data: { connected: false, lastSyncAt: null },
    refetch: jest.fn(),
  }),
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));

jest.mock("@/lib/ui/ModuleScreenShell", () => ({
  ModuleScreenShell: ({ children }: { children: unknown }) => children,
}));

jest.mock("@/lib/integrations/appleHealth/storage", () => ({
  getAppleHealthConnected: jest.fn(() => Promise.resolve(false)),
}));

jest.mock("@/lib/integrations/withings/storage", () => ({
  getWithingsLastKnownConnected: jest.fn(() => Promise.resolve(null)),
}));

jest.mock("@/lib/integrations/oura/storage", () => ({
  getOuraLastKnownConnected: jest.fn(() => Promise.resolve(null)),
}));

describe("DevicesScreen", () => {
  beforeEach(() => {
    (global as unknown as { fetch: unknown }).fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        headers: new Map([["x-request-id", "req-1"]]),
        text: () =>
          Promise.resolve(
            JSON.stringify({
              ok: true,
              requestId: "req-1",
              connected: true,
              lastSyncAt: null,
            }),
          ),
      } as unknown as Response),
    );
  });

  it("renders without throwing", async () => {
    allowConsoleForThisTest({ error: [/act\(\.\.\.\)/] });
    let tree: renderer.ReactTestRenderer | undefined;
    await act(async () => {
      tree = renderer.create(<DevicesScreen />);
    });
    expect(tree!.toJSON()).toBeTruthy();
  });

  it("shows Oura device row", async () => {
    let tree: renderer.ReactTestRenderer | undefined;
    await act(async () => {
      tree = renderer.create(<DevicesScreen />);
    });
    const json = tree!.toJSON() as { children?: unknown[] } | null;
    const str = JSON.stringify(json);
    expect(str).toContain("Oura");
  });
});
