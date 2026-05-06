import React from "react";
import renderer, { act } from "react-test-renderer";

jest.mock("@/lib/data/dailyFactsSessionCache", () => ({
  getDailyFactsSessionCached: jest.fn(),
}));

const mockAuth = {
  user: { uid: "u1" },
  initializing: false,
  getIdToken: jest.fn().mockResolvedValue("token-1"),
};

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => mockAuth,
}));

jest.mock("@/lib/ui/calendar/dateUtils", () => {
  const actual = jest.requireActual<typeof import("@/lib/ui/calendar/dateUtils")>("@/lib/ui/calendar/dateUtils");
  return {
    ...actual,
    getTodayDayKeyLocal: () => "2026-04-14",
  };
});

import { getDailyFactsSessionCached } from "@/lib/data/dailyFactsSessionCache";
import { computeActivityOverviewFetchDayKeys } from "@/lib/data/activity/activityOverviewRanges";
import {
  ActivityRollupProvider,
  useActivityStepsRollupMap,
} from "@/lib/data/activity/ActivityRollupProvider";
import type { DayKey } from "@/lib/ui/calendar/types";

const TODAY = "2026-04-14";

function minimalDailyFactsOk(day: string) {
  return {
    ok: true as const,
    status: 200,
    requestId: "r0",
    json: {
      schemaVersion: 1 as const,
      userId: "u1",
      date: day,
      computedAt: "2026-04-14T12:00:00.000Z",
      activity: { steps: 1000 },
    },
  };
}

function DualBaseConsumers() {
  useActivityStepsRollupMap(TODAY, { registerStripAnchor: false });
  return null;
}

function TwoBaseHooks() {
  return (
    <>
      <DualBaseConsumers />
      <DualBaseConsumers />
    </>
  );
}

describe("ActivityRollupProvider", () => {
  beforeEach(() => {
    (getDailyFactsSessionCached as jest.Mock).mockReset();
    (getDailyFactsSessionCached as jest.Mock).mockImplementation(async ({ day }: { day: string }) =>
      minimalDailyFactsOk(day),
    );
  });

  it("uses one DailyFacts wave for two useActivityStepsRollupMap consumers (no duplicate per-day GETs)", async () => {
    const expectedKeys = computeActivityOverviewFetchDayKeys(TODAY, TODAY);

    await act(async () => {
      renderer.create(
        <ActivityRollupProvider>
          <TwoBaseHooks />
        </ActivityRollupProvider>,
      );
    });
    await act(async () => {
      await Promise.all([Promise.resolve(), Promise.resolve(), Promise.resolve()]);
    });

    expect(getDailyFactsSessionCached).toHaveBeenCalledTimes(expectedKeys.length);
    const calledDays = (getDailyFactsSessionCached as jest.Mock).mock.calls.map(
      (c) => (c[0] as { day: string }).day,
    );
    expect(new Set(calledDays).size).toBe(expectedKeys.length);
  });

  it("shares one refetch function across consumers", async () => {
    const refetches: ReturnType<typeof useActivityStepsRollupMap>["refetch"][] = [];
    function C1() {
      const v = useActivityStepsRollupMap(TODAY, { registerStripAnchor: false });
      refetches.push(v.refetch);
      return null;
    }
    function C2() {
      const v = useActivityStepsRollupMap(TODAY, { registerStripAnchor: false });
      refetches.push(v.refetch);
      return null;
    }
    await act(async () => {
      renderer.create(
        <ActivityRollupProvider>
          <C1 />
          <C2 />
        </ActivityRollupProvider>,
      );
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(refetches[0]).toBe(refetches[1]);
    const nBefore = (getDailyFactsSessionCached as jest.Mock).mock.calls.length;
    await act(async () => {
      refetches[0]?.({ cacheBust: "manual-refetch-test" });
      await Promise.all([Promise.resolve(), Promise.resolve(), Promise.resolve()]);
    });
    expect((getDailyFactsSessionCached as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(nBefore);
  });

  it("extends union when a strip anchor is registered (Activity) without doubling base keys", async () => {
    const baseKeys = computeActivityOverviewFetchDayKeys(TODAY, TODAY);
    const stripDay = "2026-03-01";
    const union = new Set<DayKey>([...baseKeys, ...computeActivityOverviewFetchDayKeys(stripDay, TODAY)]);

    function StripConsumer() {
      useActivityStepsRollupMap(stripDay, { registerStripAnchor: true });
      return null;
    }
    function DashConsumer() {
      useActivityStepsRollupMap(TODAY, { registerStripAnchor: false });
      return null;
    }

    await act(async () => {
      renderer.create(
        <ActivityRollupProvider>
          <DashConsumer />
          <StripConsumer />
        </ActivityRollupProvider>,
      );
    });
    await act(async () => {
      await Promise.all([Promise.resolve(), Promise.resolve(), Promise.resolve()]);
    });

    expect(getDailyFactsSessionCached).toHaveBeenCalledTimes(union.size);
  });
});
