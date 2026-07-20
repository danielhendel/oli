/**
 * Day-key lifecycle for Daily Monitor: midnight rollover, foreground refresh, cleanup.
 */

import React from "react";
import renderer, { act } from "react-test-renderer";
import { AppState } from "react-native";

import { useCurrentLocalDayKey } from "../useCurrentLocalDayKey";

const mockGetTodayDayKeyLocal = jest.fn(() => "2026-07-20");

jest.mock("@/lib/ui/calendar/dateUtils", () => ({
  getTodayDayKeyLocal: () => mockGetTodayDayKeyLocal(),
}));

let appStateListener: ((state: "active" | "inactive" | "background") => void) | null = null;
let removeSpy: jest.Mock;

function Host({ onState }: { onState: (s: ReturnType<typeof useCurrentLocalDayKey>) => void }) {
  const state = useCurrentLocalDayKey();
  onState(state);
  return null;
}

describe("useCurrentLocalDayKey", () => {
  let appStateAddListenerSpy: jest.SpyInstance;
  let latest: ReturnType<typeof useCurrentLocalDayKey> | null = null;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockGetTodayDayKeyLocal.mockReturnValue("2026-07-20");
    appStateListener = null;
    removeSpy = jest.fn();
    appStateAddListenerSpy = jest
      .spyOn(AppState, "addEventListener")
      .mockImplementation((_event, cb: (s: "active" | "inactive" | "background") => void) => {
        appStateListener = cb;
        return { remove: removeSpy };
      });
    latest = null;
  });

  afterEach(() => {
    appStateAddListenerSpy.mockRestore();
    jest.useRealTimers();
  });

  it("initializes from the canonical local-day helper", () => {
    act(() => {
      renderer.create(
        React.createElement(Host, {
          onState: (s) => {
            latest = s;
          },
        }),
      );
    });
    expect(latest?.dayKey).toBe("2026-07-20");
    expect(appStateAddListenerSpy).toHaveBeenCalledTimes(1);
  });

  it("updates the day key after local midnight without duplicate storm", () => {
    act(() => {
      renderer.create(
        React.createElement(Host, {
          onState: (s) => {
            latest = s;
          },
        }),
      );
    });
    expect(latest?.dayKey).toBe("2026-07-20");

    mockGetTodayDayKeyLocal.mockReturnValue("2026-07-21");
    act(() => {
      // Advance past the scheduled midnight timeout (capped by msUntilNextLocalMidnight).
      jest.advanceTimersByTime(24 * 60 * 60 * 1000 + 1000);
    });
    expect(latest?.dayKey).toBe("2026-07-21");

    const callsBefore = mockGetTodayDayKeyLocal.mock.calls.length;
    act(() => {
      jest.advanceTimersByTime(100);
    });
    // Unchanged key must not thrash setState / extra unnecessary churn beyond the timer tick.
    expect(mockGetTodayDayKeyLocal.mock.calls.length).toBeLessThanOrEqual(callsBefore + 1);
    expect(latest?.dayKey).toBe("2026-07-21");
  });

  it("refreshes when the app returns to the foreground", () => {
    act(() => {
      renderer.create(
        React.createElement(Host, {
          onState: (s) => {
            latest = s;
          },
        }),
      );
    });
    mockGetTodayDayKeyLocal.mockReturnValue("2026-07-21");
    act(() => {
      appStateListener?.("active");
    });
    expect(latest?.dayKey).toBe("2026-07-21");
  });

  it("does not update state when the day key is unchanged on foreground", () => {
    act(() => {
      renderer.create(
        React.createElement(Host, {
          onState: (s) => {
            latest = s;
          },
        }),
      );
    });
    const before = latest;
    act(() => {
      appStateListener?.("active");
    });
    expect(latest?.dayKey).toBe("2026-07-20");
    expect(latest).toBe(before);
  });

  it("cleans up AppState listener and timers on unmount", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        React.createElement(Host, {
          onState: (s) => {
            latest = s;
          },
        }),
      );
    });
    act(() => {
      tree!.unmount();
    });
    expect(removeSpy).toHaveBeenCalledTimes(1);
  });
});
