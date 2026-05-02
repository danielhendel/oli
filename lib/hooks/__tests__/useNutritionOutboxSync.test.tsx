import React from "react";
import renderer, { act } from "react-test-renderer";
import { AppState } from "react-native";
import NetInfo, { useNetInfo } from "@react-native-community/netinfo";
import { useNutritionOutboxSync } from "../useNutritionOutboxSync";
import { NutritionQueue } from "@/lib/nutrition/NutritionQueue";

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: { uid: "u1" },
    getIdToken: jest.fn(async () => "token-1"),
  }),
}));

jest.mock("@/lib/nutrition/NutritionQueue", () => ({
  NutritionQueue: {
    flush: jest.fn(async () => ({ flushed: 1, failed: 0 })),
  },
}));

let netListener: ((state: { isConnected: boolean | null }) => void) | null = null;
let appStateListener: ((state: "active" | "inactive" | "background") => void) | null = null;

jest.mock("@react-native-community/netinfo", () => ({
  __esModule: true,
  default: {
    addEventListener: jest.fn((cb: (state: { isConnected: boolean | null }) => void) => {
      netListener = cb;
      return jest.fn();
    }),
  },
  useNetInfo: jest.fn(() => ({ isConnected: true })),
}));

function Host() {
  useNutritionOutboxSync();
  return null;
}

describe("useNutritionOutboxSync", () => {
  const flushMock = NutritionQueue.flush as jest.MockedFunction<typeof NutritionQueue.flush>;
  const useNetInfoMock = useNetInfo as jest.Mock;
  const netInfoAddListenerMock = NetInfo.addEventListener as jest.Mock;
  let appStateAddListenerSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    netListener = null;
    appStateListener = null;
    useNetInfoMock.mockReturnValue({ isConnected: true });
    appStateAddListenerSpy = jest
      .spyOn(AppState, "addEventListener")
      .mockImplementation((_event, cb: (s: "active" | "inactive" | "background") => void) => {
        appStateListener = cb;
        return { remove: jest.fn() };
      });
  });

  afterEach(() => {
    appStateAddListenerSpy.mockRestore();
  });

  it("flushes queue on mount and connectivity/appstate events, without calling global fetch", async () => {
    const fetchSpy = jest.spyOn(global, "fetch");

    await act(async () => {
      renderer.create(React.createElement(Host));
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(netInfoAddListenerMock).toHaveBeenCalledTimes(1);
    expect(appStateAddListenerSpy).toHaveBeenCalledTimes(1);
    expect(flushMock).toHaveBeenCalledTimes(1);

    expect(netListener).not.toBeNull();
    await act(async () => {
      netListener?.({ isConnected: true });
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(flushMock).toHaveBeenCalledTimes(2);

    expect(appStateListener).not.toBeNull();
    await act(async () => {
      appStateListener?.("active");
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(flushMock).toHaveBeenCalledTimes(3);
    expect(fetchSpy).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
  });

  it("does not flush while offline", async () => {
    useNetInfoMock.mockReturnValue({ isConnected: false });

    await act(async () => {
      renderer.create(React.createElement(Host));
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(flushMock).not.toHaveBeenCalled();
  });
});
