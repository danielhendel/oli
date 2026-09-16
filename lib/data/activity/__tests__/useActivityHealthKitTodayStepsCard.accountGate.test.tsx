import { describe, it, expect, jest, beforeEach, afterAll } from "@jest/globals";
import React from "react";
import { Platform } from "react-native";
import renderer, { act } from "react-test-renderer";

const mockPull = jest.fn(async () => ({ ok: true as const, steps: 1234 }));
const mockGetConnected = jest.fn(async () => false);

jest.mock("@react-navigation/native", () => {
  const ReactLocal = require("react") as typeof import("react");
  return {
    useFocusEffect: (cb: () => void | (() => void)) => {
      ReactLocal.useEffect(() => {
        const cleanup = cb();
        return typeof cleanup === "function" ? cleanup : undefined;
      }, [cb]);
    },
  };
});

jest.mock("@/lib/integrations/appleHealth", () => ({
  pullStepCountForLocalCalendarDay: (...args: unknown[]) => mockPull(...args),
}));

jest.mock("@/lib/integrations/appleHealth/storage", () => ({
  getAppleHealthConnected: (...args: unknown[]) => mockGetConnected(...args),
}));

import { useActivityHealthKitTodayStepsCard } from "../useActivityHealthKitTodayStepsCard";

function Host({ enabled }: { enabled: boolean }) {
  useActivityHealthKitTodayStepsCard({ todayDayKey: "2026-09-13", enabled });
  return null;
}

describe("useActivityHealthKitTodayStepsCard account gate", () => {
  const originalOs = Platform.OS;

  beforeEach(() => {
    mockPull.mockClear();
    mockGetConnected.mockClear();
    mockGetConnected.mockResolvedValue(false);
    mockPull.mockResolvedValue({ ok: true, steps: 1234 });
    Object.defineProperty(Platform, "OS", { configurable: true, value: "ios" });
  });

  afterAll(() => {
    Object.defineProperty(Platform, "OS", { configurable: true, value: originalOs });
  });

  it("does not query HealthKit when account is not connected", async () => {
    mockGetConnected.mockResolvedValue(false);
    await act(async () => {
      renderer.create(React.createElement(Host, { enabled: true }));
    });
    await act(async () => {
      await new Promise<void>((r) => setImmediate(r));
    });
    expect(mockGetConnected).toHaveBeenCalled();
    expect(mockPull).not.toHaveBeenCalled();
  });

  it("queries HealthKit only after account is connected", async () => {
    mockGetConnected.mockResolvedValue(true);
    await act(async () => {
      renderer.create(React.createElement(Host, { enabled: true }));
    });
    await act(async () => {
      await new Promise<void>((r) => setImmediate(r));
    });
    expect(mockPull).toHaveBeenCalledWith("2026-09-13");
  });
});
