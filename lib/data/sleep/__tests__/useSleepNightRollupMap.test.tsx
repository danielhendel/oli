import React from "react";
import renderer, { act } from "react-test-renderer";
import { Text } from "react-native";

import { getSleepNight } from "@/lib/api/usersMe";
import { useSleepNightRollupMap } from "@/lib/data/sleep/useSleepNightRollupMap";
import type { DayKey } from "@/lib/ui/calendar/types";

const mockUseAuth = jest.fn();

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock("@/lib/api/usersMe", () => ({
  getSleepNight: jest.fn(),
}));

jest.mock("@/lib/ui/calendar/dateUtils", () => ({
  ...jest.requireActual("@/lib/ui/calendar/dateUtils"),
  getTodayDayKeyLocal: () => "2026-04-06",
}));

const getSleepNightMock = getSleepNight as jest.MockedFunction<typeof getSleepNight>;

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
    getSleepNightMock.mockReset();
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
    expect(getSleepNightMock).not.toHaveBeenCalled();
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
    expect(getSleepNightMock).not.toHaveBeenCalled();
  });

  it("fetches elapsed days and populates per-day cells with views", async () => {
    getSleepNightMock.mockImplementation(async (day: string) => ({
      ok: true,
      status: 200,
      requestId: "r",
      json: makeView(day as DayKey, 445),
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
  });

  it("drops stale wave responses when dayKeys changes mid-flight", async () => {
    let resolveA: ((v: unknown) => void) | null = null;
    getSleepNightMock.mockImplementationOnce(
      () =>
        new Promise((res) => {
          resolveA = (v) => res(v as never);
        }) as never,
    );

    let root!: renderer.ReactTestRenderer;
    await act(async () => {
      root = renderer.create(<Probe dayKeys={["2026-04-05"]} />);
    });

    getSleepNightMock.mockImplementationOnce(async (day: string) => ({
      ok: true,
      status: 200,
      requestId: "r",
      json: makeView(day as DayKey, 360),
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
        json: makeView("2026-04-05", 999),
      });
      await Promise.resolve();
    });

    const out = root.root.findByProps({ testID: "out" }).props.children as string;
    expect(out).toContain("settled=1/1");
    expect(out).toContain("views=1");
  });
});
