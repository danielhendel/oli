/**
 * Devices list — integration status display.
 * Verifies screen renders; refetch on focus; Oura auto-refresh (throttled) when connected.
 */
import React from "react";
import { act } from "react";
import renderer from "react-test-renderer";
import { allowConsoleForThisTest } from "../../../../../scripts/test/consoleGuard";
import { getAppleHealthStatus } from "@/lib/api/appleHealth";
import DevicesScreen from "../../devices";

const mockPostOuraPullNow = jest.fn().mockResolvedValue({
  ok: true,
  requestId: "req-oura",
  windowDays: 30,
  eventsCreated: 0,
  eventsAlreadyExists: 0,
});
const mockGetOuraLastCheckedAt = jest.fn().mockResolvedValue(null);
const mockSetOuraLastCheckedAt = jest.fn().mockResolvedValue(undefined);

let mockOuraConnected = false;

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  StyleSheet: { create: (s: unknown) => s },
  AppState: {
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
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

jest.mock("@/lib/data/useOuraPresence", () => ({
  useOuraPresence: () => ({
    status: "ready",
    data: { connected: mockOuraConnected, lastSyncAt: null },
    refetch: jest.fn(),
  }),
}));

jest.mock("@/lib/api/oura", () => ({
  getOuraConnectUrl: jest.fn(),
  postOuraRevoke: jest.fn(),
  postOuraPullNow: (...args: unknown[]) => mockPostOuraPullNow(...args),
}));

jest.mock("@/lib/api/appleHealth", () => ({
  getAppleHealthStatus: jest.fn(),
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));

jest.mock("@/lib/ui/ModuleScreenShell", () => ({
  ModuleScreenShell: ({ children }: { children: unknown }) => children,
}));

const mockResolveAppleHealthDeviceConnected = jest.fn(async (api: boolean) => api);

jest.mock("@/lib/integrations/appleHealth/resolveAppleHealthDeviceConnected", () => ({
  resolveAppleHealthDeviceConnected: (...args: unknown[]) =>
    mockResolveAppleHealthDeviceConnected(...(args as [boolean])),
}));

jest.mock("@/lib/integrations/oura/storage", () => ({
  getOuraLastKnownConnected: jest.fn(() => Promise.resolve(null)),
  getOuraLastCheckedAt: (...args: unknown[]) => mockGetOuraLastCheckedAt(...args),
  setOuraLastCheckedAt: (...args: unknown[]) => mockSetOuraLastCheckedAt(...args),
}));

const mockGetAppleHealthStatus = getAppleHealthStatus as jest.MockedFunction<typeof getAppleHealthStatus>;

describe("DevicesScreen", () => {
  beforeEach(() => {
    mockOuraConnected = false;
    mockGetOuraLastCheckedAt.mockResolvedValue(null);
    mockPostOuraPullNow.mockClear();
    mockSetOuraLastCheckedAt.mockClear();
    mockGetAppleHealthStatus.mockClear();
    mockResolveAppleHealthDeviceConnected.mockImplementation(async (api: boolean) => api);
    mockGetAppleHealthStatus.mockResolvedValue({
      ok: true,
      status: 200,
      requestId: "req-apple",
      json: {
        ok: true,
        requestId: "req-apple",
        connected: true,
        lastSyncAt: null,
      },
    });
    (global as unknown as { fetch: unknown }).fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
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

  it("shows Apple Health as Connected when status API reports connected", async () => {
    let tree: renderer.ReactTestRenderer | undefined;
    await act(async () => {
      tree = renderer.create(<DevicesScreen />);
    });
    await act(async () => {
      await Promise.resolve();
    });
    const str = JSON.stringify(tree!.toJSON());
    expect(str).toContain("Apple Health");
    expect(str).toContain("Connected");
  });

  it("shows Apple Health as Connected when resolver upgrades API not_connected (e.g. HK authorized)", async () => {
    mockResolveAppleHealthDeviceConnected.mockImplementation(async () => true);
    mockGetAppleHealthStatus.mockResolvedValue({
      ok: true,
      status: 200,
      requestId: "req-apple-2",
      json: {
        ok: true,
        requestId: "req-apple-2",
        connected: false,
        lastSyncAt: null,
      },
    });
    let tree: renderer.ReactTestRenderer | undefined;
    await act(async () => {
      tree = renderer.create(<DevicesScreen />);
    });
    await act(async () => {
      await Promise.resolve();
    });
    const str = JSON.stringify(tree!.toJSON());
    expect(str).toContain("Connected");
  });

  describe("Oura auto-refresh", () => {
    it("calls postOuraPullNow when Oura is connected and lastCheckedAt is null", async () => {
      mockOuraConnected = true;
      mockGetOuraLastCheckedAt.mockResolvedValue(null);
      await act(async () => {
        renderer.create(<DevicesScreen />);
      });
      await act(async () => {
        await Promise.resolve();
      });
      await act(async () => {
        await Promise.resolve();
      });
      expect(mockPostOuraPullNow).toHaveBeenCalled();
      expect(mockSetOuraLastCheckedAt).toHaveBeenCalled();
    });

    it("does not call postOuraPullNow when Oura is disconnected", async () => {
      mockOuraConnected = false;
      mockGetOuraLastCheckedAt.mockResolvedValue(null);
      await act(async () => {
        renderer.create(<DevicesScreen />);
      });
      await act(async () => {
        await Promise.resolve();
      });
      await act(async () => {
        await Promise.resolve();
      });
      expect(mockPostOuraPullNow).not.toHaveBeenCalled();
    });

    it("does not call postOuraPullNow when lastCheckedAt is recent (throttle)", async () => {
      mockOuraConnected = true;
      mockGetOuraLastCheckedAt.mockResolvedValue(new Date().toISOString());
      await act(async () => {
        renderer.create(<DevicesScreen />);
      });
      await act(async () => {
        await Promise.resolve();
      });
      await act(async () => {
        await Promise.resolve();
      });
      expect(mockPostOuraPullNow).not.toHaveBeenCalled();
    });
  });
});
