import React from "react";
import renderer, { act } from "react-test-renderer";
import { Text } from "react-native";

import { SLEEP_NIGHT_RANGE_MAX_DAYS } from "@oli/contracts";

import { getSleepNightsRange } from "@/lib/api/usersMe";
import { useSleepNightRollupMap } from "@/lib/data/sleep/useSleepNightRollupMap";
import type { DayKey } from "@/lib/ui/calendar/types";

const mockUseAuth = jest.fn();

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock("@/lib/api/usersMe", () => ({
  getSleepNightsRange: jest.fn(),
}));

jest.mock("@/lib/ui/calendar/dateUtils", () => ({
  ...jest.requireActual("@/lib/ui/calendar/dateUtils"),
  getTodayDayKeyLocal: () => "2026-04-06",
}));

const getSleepNightsRangeMock = getSleepNightsRange as jest.MockedFunction<typeof getSleepNightsRange>;

function makeView(day: DayKey, minutes: number) {
  return {
    requestedDay: day,
    anchorDay: day,
    wakeDay: day,
    resolution: "exact_anchor" as const,
    isFallback: false,
    sleepNight: {
      anchorDay: day,
      wakeDay: day,
      provider: "oura",
      source: "ouraVendorSleep",
      sourceDocumentId: `s:${day}`,
      isComplete: true,
      mainSleepMinutes: minutes,
      totalSleepMinutes: minutes,
      updatedAt: `${day}T12:00:00.000Z`,
    },
  };
}

function Probe({ dayKeys }: { dayKeys: readonly DayKey[] }) {
  const r = useSleepNightRollupMap(dayKeys);
  const settledCount = dayKeys.filter(
    (d) => r.sleepNightByDay[d]?.settled === true,
  ).length;
  const withView = dayKeys.filter(
    (d) => r.sleepNightByDay[d]?.view != null,
  ).length;
  return (
    <Text testID="out">{`status=${r.status} settled=${settledCount}/${dayKeys.length} views=${withView}`}</Text>
  );
}

describe("useSleepNightRollupMap", () => {
  beforeEach(() => {
    getSleepNightsRangeMock.mockReset();
    mockUseAuth.mockReturnValue({
      user: { uid: "u1" },
      initializing: false,
      getIdToken: jest.fn(async () => "tok"),
    });
  });

  it("settles ready/empty when there are no elapsed day keys to fetch (future-only)", async () => {
    let root!: renderer.ReactTestRenderer;
    await act(async () => {
      root = renderer.create(<Probe dayKeys={["2026-04-07", "2026-04-08"]} />);
    });
    await act(async () => {
      await Promise.resolve();
    });
    const out = root.root.findByProps({ testID: "out" }).props.children as string;
    expect(out).toContain("status=ready");
    expect(out).toContain("views=0");
    expect(getSleepNightsRangeMock).not.toHaveBeenCalled();
  });

  it("settles when initializing then user is absent (no token branch)", async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      initializing: false,
      getIdToken: jest.fn(async () => null),
    });
    let root!: renderer.ReactTestRenderer;
    await act(async () => {
      root = renderer.create(<Probe dayKeys={["2026-04-05", "2026-04-06"]} />);
    });
    await act(async () => {
      await Promise.resolve();
    });
    const out = root.root.findByProps({ testID: "out" }).props.children as string;
    expect(out).toContain("status=ready");
    expect(getSleepNightsRangeMock).not.toHaveBeenCalled();
  });

  it("fetches one range and populates per-day cells with views", async () => {
    getSleepNightsRangeMock.mockImplementation(async (start, end) => ({
      ok: true,
      status: 200,
      requestId: "r",
      json: {
        start,
        end,
        dayCount: 2,
        resolvedCount: 2,
        nights: [makeView("2026-04-05", 445), makeView("2026-04-06", 445)],
      },
    }) as never);
    let root!: renderer.ReactTestRenderer;
    await act(async () => {
      root = renderer.create(<Probe dayKeys={["2026-04-05", "2026-04-06"]} />);
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    const out = root.root.findByProps({ testID: "out" }).props.children as string;
    expect(out).toContain("status=ready");
    expect(out).toContain("settled=2/2");
    expect(out).toContain("views=2");
    expect(getSleepNightsRangeMock).toHaveBeenCalledTimes(1);
    expect(getSleepNightsRangeMock.mock.calls[0]!.slice(0, 2)).toEqual(["2026-04-05", "2026-04-06"]);
  });

  it("marks sparse missing nights as settled empty without per-day 404s", async () => {
    getSleepNightsRangeMock.mockImplementation(async (start, end) => ({
      ok: true,
      status: 200,
      requestId: "r",
      json: {
        start,
        end,
        dayCount: 2,
        resolvedCount: 1,
        nights: [makeView("2026-04-06", 400)],
      },
    }) as never);
    let root!: renderer.ReactTestRenderer;
    await act(async () => {
      root = renderer.create(<Probe dayKeys={["2026-04-05", "2026-04-06"]} />);
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    const out = root.root.findByProps({ testID: "out" }).props.children as string;
    expect(out).toContain("status=ready");
    expect(out).toContain("settled=2/2");
    expect(out).toContain("views=1");
  });

  it("drops stale wave responses when dayKeys changes mid-flight", async () => {
    let resolveA: ((v: unknown) => void) | null = null;
    getSleepNightsRangeMock.mockImplementationOnce(
      () =>
        new Promise((res) => {
          resolveA = (v) => res(v as never);
        }) as never,
    );

    let root!: renderer.ReactTestRenderer;
    await act(async () => {
      root = renderer.create(<Probe dayKeys={["2026-04-05"]} />);
    });

    getSleepNightsRangeMock.mockImplementationOnce(async (start, end) => ({
      ok: true,
      status: 200,
      requestId: "r",
      json: {
        start,
        end,
        dayCount: 1,
        resolvedCount: 1,
        nights: [makeView("2026-04-06", 360)],
      },
    }) as never);

    await act(async () => {
      root.update(<Probe dayKeys={["2026-04-06"]} />);
    });
    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      resolveA?.({
        ok: true,
        status: 200,
        requestId: "r",
        json: {
          start: "2026-04-05",
          end: "2026-04-05",
          dayCount: 1,
          resolvedCount: 1,
          nights: [makeView("2026-04-05", 999)],
        },
      });
      await Promise.resolve();
    });

    const out = root.root.findByProps({ testID: "out" }).props.children as string;
    expect(out).toContain("settled=1/1");
    expect(out).toContain("views=1");
  });

  it("chunks year-long dayKeys into bounded range calls (not one per day)", async () => {
    getSleepNightsRangeMock.mockImplementation(async (start, end) => ({
      ok: true,
      status: 200,
      requestId: "r",
      json: {
        start,
        end,
        dayCount: 1,
        resolvedCount: 0,
        nights: [],
      },
    }) as never);

    const yearKeys: DayKey[] = [];
    for (let i = 365; i >= 0; i--) {
      const d = new Date(Date.UTC(2026, 3, 6));
      d.setUTCDate(d.getUTCDate() - i);
      yearKeys.push(d.toISOString().slice(0, 10) as DayKey);
    }

    await act(async () => {
      renderer.create(<Probe dayKeys={yearKeys} />);
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    const expectedWindows = Math.ceil(yearKeys.length / SLEEP_NIGHT_RANGE_MAX_DAYS);
    expect(getSleepNightsRangeMock.mock.calls.length).toBe(expectedWindows);
    expect(getSleepNightsRangeMock.mock.calls.length).toBeLessThan(yearKeys.length);
    expect(getSleepNightsRangeMock.mock.calls.length).toBeGreaterThan(1);
  });
});
