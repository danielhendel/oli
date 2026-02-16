/**
 * Devices screen — Withings row and fail-closed when status API errors.
 */
import React from "react";
import renderer, { act } from "react-test-renderer";

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  ScrollView: "ScrollView",
  Pressable: "Pressable",
  ActivityIndicator: "ActivityIndicator",
  StyleSheet: { create: (s: unknown) => s },
  Linking: {
    openURL: jest.fn().mockResolvedValue(undefined),
    canOpenURL: jest.fn().mockResolvedValue(true),
  },
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

const mockGetIdToken = jest.fn().mockResolvedValue("mock-token");
jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: { uid: "user1" },
    initializing: false,
    getIdToken: mockGetIdToken,
  }),
}));

const mockRefetch = jest.fn();
jest.mock("@/lib/data/useWithingsPresence", () => ({
  useWithingsPresence: jest.fn(),
}));

jest.mock("@/lib/api/withings", () => ({
  getWithingsConnectUrl: jest.fn(),
  pullWithings: jest.fn(),
}));

import { useWithingsPresence } from "@/lib/data/useWithingsPresence";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const DevicesScreen = require("../devices").default;

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

describe("DevicesScreen Withings", () => {
  beforeEach(() => {
    (useWithingsPresence as jest.Mock).mockReturnValue({
      status: "ready",
      data: { connected: false, lastMeasurementAt: null, hasRecentData: false },
      refetch: mockRefetch,
    });
  });

  it("renders Withings card with status and Connect button", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<DevicesScreen />);
    });
    const text = collectAllText(test);
    expect(text).toContain("Withings");
    expect(text).toContain("Not connected");
    expect(text).toContain("Connect Withings");
    expect(text).toContain("Status");
  });

  it("shows Error loading status when useWithingsPresence returns error (fail-closed)", () => {
    (useWithingsPresence as jest.Mock).mockReturnValue({
      status: "error",
      error: "Invalid response shape",
      requestId: "req-1",
      refetch: mockRefetch,
    });
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<DevicesScreen />);
    });
    const text = collectAllText(test);
    expect(text).toContain("Error loading status");
    expect(text).toContain("Withings");
    expect(text).toContain("Connect Withings");
  });
});
