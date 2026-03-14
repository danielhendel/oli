/**
 * Device detail screen (Oura): no "Sync now" button — sync is automatic after connect.
 */
import React from "react";
import { act } from "react";
import renderer from "react-test-renderer";

import DeviceDetailScreen from "../[deviceId]";

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
  Alert: { alert: jest.fn() },
  ScrollView: "ScrollView",
  StyleSheet: { create: (s: unknown) => s },
}));

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ deviceId: "oura" }),
  useNavigation: () => ({ setOptions: jest.fn() }),
}));

jest.mock("expo-web-browser", () => ({}));

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: { uid: "u1" },
    getIdToken: async () => "token",
  }),
}));

jest.mock("@/lib/data/useWithingsPresence", () => ({
  useWithingsPresence: () => ({
    status: "ready",
    data: { connected: false },
    refetch: jest.fn(),
  }),
}));

jest.mock("@/lib/data/useOuraPresence", () => ({
  useOuraPresence: () => ({
    status: "ready",
    data: { connected: true, lastSyncAt: "2025-03-14T12:00:00.000Z" },
    refetch: jest.fn(),
  }),
}));

jest.mock("@/lib/api/withings", () => ({}));
jest.mock("@/lib/api/oura", () => ({
  getOuraConnectUrl: jest.fn(),
  postOuraRevoke: jest.fn(),
}));
jest.mock("@/lib/api/appleHealth", () => ({}));

jest.mock("@/lib/ui/ModuleScreenShell", () => ({
  ModuleScreenShell: ({ children }: { children: unknown }) => children,
}));

describe("DeviceDetailScreen (Oura)", () => {
  it("does not show Sync now when Oura is connected (sync is automatic)", async () => {
    let tree: renderer.ReactTestRenderer | undefined;
    await act(async () => {
      tree = renderer.create(<DeviceDetailScreen />);
    });
    const json = tree!.toJSON();
    const str = JSON.stringify(json);
    expect(str).not.toContain("Sync now");
    expect(str).toContain("Oura");
  });
});
