import React from "react";
import renderer, { act } from "react-test-renderer";
import { Text } from "react-native";

import { getSleepNight } from "@/lib/api/usersMe";
import { useDailySleepCard } from "@/lib/hooks/useDailySleepCard";
import { __resetSleepTodayRecoveryLedgerForTests } from "@/lib/data/sleep/runSleepTodayRecoveryIfMissing";

const TODAY = "2026-04-06";
const YESTERDAY = "2026-04-05";

const mockPostOuraSleepDayRefresh = jest.fn();

jest.mock("@/lib/api/ouraSleepDayRefresh", () => ({
  postOuraSleepDayRefresh: (...args: unknown[]) =>
    mockPostOuraSleepDayRefresh(...args),
}));

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

function Probe({ day }: { day: string }) {
  const { vm } = useDailySleepCard(day);
  return <Text testID="out">{vm.status}</Text>;
}

describe("useDailySleepCard today-recovery", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetSleepTodayRecoveryLedgerForTests();
    mockUseAuth.mockReturnValue({
      user: { uid: "user-a" },
      initializing: false,
      getIdToken: jest.fn(async () => "tok"),
    });
    mockPostOuraSleepDayRefresh.mockResolvedValue({
      ok: true,
      status: 200,
      requestId: "r1",
      json: { ok: true, requestId: "r1", day: TODAY, pullNowStatus: 202 },
    });
  });

  it("fires exactly one canonical recovery call when today is settled-and-missing", async () => {
    getSleepNightMock.mockResolvedValue({
      ok: false,
      status: 404,
      requestId: null,
      error: "not found",
      kind: "http",
    } as never);

    let root!: renderer.ReactTestRenderer;
    await act(async () => {
      root = renderer.create(<Probe day={TODAY} />);
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(root.root.findByProps({ testID: "out" }).props.children).toBe("missing");
    expect(mockPostOuraSleepDayRefresh).toHaveBeenCalledTimes(1);
    expect(mockPostOuraSleepDayRefresh.mock.calls[0]?.[1]).toEqual({ day: TODAY });
  });

  it("does NOT fire recovery for a historical missing day (yesterday)", async () => {
    getSleepNightMock.mockResolvedValue({
      ok: false,
      status: 404,
      requestId: null,
      error: "not found",
      kind: "http",
    } as never);

    await act(async () => {
      renderer.create(<Probe day={YESTERDAY} />);
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(mockPostOuraSleepDayRefresh).not.toHaveBeenCalled();
  });

  it("does NOT fire recovery when today's sleep is already attributed (ready)", async () => {
    getSleepNightMock.mockResolvedValue({
      ok: true,
      status: 200,
      requestId: null,
      json: {
        requestedDay: TODAY,
        anchorDay: TODAY,
        wakeDay: TODAY,
        resolution: "exact_anchor",
        isFallback: false,
        sleepNight: {
          anchorDay: TODAY,
          wakeDay: TODAY,
          provider: "oura",
          source: "ouraVendorSleep",
          sourceDocumentId: "s1",
          isComplete: true,
          mainSleepMinutes: 445,
          totalSleepMinutes: 445,
          updatedAt: `${TODAY}T12:00:00.000Z`,
        },
      },
    });

    let root!: renderer.ReactTestRenderer;
    await act(async () => {
      root = renderer.create(<Probe day={TODAY} />);
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(root.root.findByProps({ testID: "out" }).props.children).toBe("ready");
    expect(mockPostOuraSleepDayRefresh).not.toHaveBeenCalled();
  });

  it("rejects latest_completed_prior_night as not-attributed and triggers recovery", async () => {
    getSleepNightMock.mockResolvedValue({
      ok: true,
      status: 200,
      requestId: null,
      json: {
        requestedDay: TODAY,
        anchorDay: YESTERDAY,
        wakeDay: YESTERDAY,
        resolution: "latest_completed_prior_night",
        isFallback: false,
        sleepNight: {
          anchorDay: YESTERDAY,
          wakeDay: YESTERDAY,
          provider: "oura",
          source: "ouraVendorSleep",
          sourceDocumentId: "s1",
          isComplete: true,
          mainSleepMinutes: 420,
          totalSleepMinutes: 420,
          updatedAt: `${YESTERDAY}T12:00:00.000Z`,
        },
      },
    });

    let root!: renderer.ReactTestRenderer;
    await act(async () => {
      root = renderer.create(<Probe day={TODAY} />);
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(root.root.findByProps({ testID: "out" }).props.children).toBe("missing");
    expect(mockPostOuraSleepDayRefresh).toHaveBeenCalledTimes(1);
  });
});
