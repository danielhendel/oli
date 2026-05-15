import React from "react";
import renderer, { act } from "react-test-renderer";

import type { DailyFactsDto } from "@oli/contracts";
import type { SleepViewDto } from "@oli/contracts";

/** Mock reads this on every render of `useDashSleepAnchorDay`. */
let mockProbeLoading = false;

const mockOvernightProbeView: SleepViewDto = {
  requestedDay: "2026-05-12",
  resolvedDay: "2026-05-11",
  isFallback: true,
  day: "2026-05-11",
  score: 72,
  contributors: {},
};

const mockGetOuraSleepView = jest.fn();
const mockGetOuraReadinessView = jest.fn();

jest.mock("@/lib/api/usersMe", () => ({
  getOuraSleepView: (...args: unknown[]) => mockGetOuraSleepView(...args),
  getOuraReadinessView: (...args: unknown[]) => mockGetOuraReadinessView(...args),
}));

const mockAuthUser = { uid: "u1" };
const mockGetIdToken = jest.fn().mockResolvedValue("id-token");

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: mockAuthUser,
    initializing: false,
    getIdToken: mockGetIdToken,
  }),
}));

const mockMinimalReadyFacts = {
  status: "ready" as const,
  data: { sleep: undefined } as unknown as DailyFactsDto,
  refetch: jest.fn(),
};

jest.mock("@/lib/data/useDailyFacts", () => ({
  useDailyFacts: () => mockMinimalReadyFacts,
}));

jest.mock("@/lib/data/dash/useDashOuraCalendarSleepProbe", () => ({
  useDashOuraCalendarSleepProbe: () => ({
    loading: mockProbeLoading,
    view: mockOvernightProbeView,
    refetch: jest.fn(),
  }),
}));

import { useDashOuraViews } from "@/lib/data/dash/useDashOuraViews";
import { useDashSleepAnchorDay } from "@/lib/hooks/useDashSleepAnchorDay";

const CAL = "2026-05-12";
const ANCHOR = "2026-05-11";

type Sink = {
  anchor: ReturnType<typeof useDashSleepAnchorDay>;
  dashOuraEnabled: boolean;
};

function DashAnchorOuraHarness({
  sink,
}: {
  sink: React.MutableRefObject<Sink | null>;
}): null {
  const anchor = useDashSleepAnchorDay(CAL);
  const dashOuraEnabled = anchor.sleepAnchorSettled || anchor.isUsingCachedSettledAnchor;
  useDashOuraViews(anchor.sleepAnchorDay, { enabled: dashOuraEnabled });
  sink.current = { anchor, dashOuraEnabled };
  return null;
}

describe("useDashSleepAnchorDay + useDashOuraViews (probe refetch regression)", () => {
  beforeEach(() => {
    mockProbeLoading = false;
    mockGetOuraSleepView.mockReset();
    mockGetOuraReadinessView.mockReset();
    mockGetOuraReadinessView.mockResolvedValue({
      ok: true,
      status: 200,
      requestId: null,
      json: {
        requestedDay: CAL,
        resolvedDay: CAL,
        isFallback: false,
        day: CAL,
        score: 80,
        contributors: {},
      },
    });
  });

  it("settled overnight 2026-05-11 -> probeLoading -> anchor stays 2026-05-11, enabled stays true, sleep fetch not superseded", async () => {
    let resolveMainSleep!: (v: unknown) => void;
    const mainSleepPromise = new Promise((resolve) => {
      resolveMainSleep = resolve;
    });

    mockGetOuraSleepView.mockImplementation((day: string) => {
      if (day === CAL) {
        return Promise.resolve({
          ok: true,
          status: 200,
          requestId: null,
          json: mockOvernightProbeView,
        });
      }
      if (day === ANCHOR) {
        return mainSleepPromise;
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        kind: "http" as const,
        error: "nope",
        requestId: null,
      });
    });

    const sink: React.MutableRefObject<Sink | null> = { current: null };
    let root: renderer.ReactTestRenderer;

    await act(async () => {
      root = renderer.create(<DashAnchorOuraHarness sink={sink} />);
      await Promise.resolve();
    });

    expect(sink.current?.anchor.sleepAnchorDay).toBe(ANCHOR);
    expect(sink.current?.anchor.sleepAnchorSettled).toBe(true);
    expect(sink.current?.anchor.isUsingCachedSettledAnchor).toBe(false);
    expect(sink.current?.dashOuraEnabled).toBe(true);
    expect(mockGetOuraSleepView.mock.calls.some((c) => c[0] === ANCHOR && c[1] === "id-token")).toBe(true);

    const callsAfterSettled = mockGetOuraSleepView.mock.calls.filter((c) => c[0] === ANCHOR).length;

    mockProbeLoading = true;

    await act(async () => {
      root.update(<DashAnchorOuraHarness sink={sink} />);
      await Promise.resolve();
    });

    expect(sink.current?.anchor.sleepAnchorDay).toBe(ANCHOR);
    expect(sink.current?.anchor.sleepAnchorSettled).toBe(true);
    expect(sink.current?.anchor.selectedReason).toBe("overnight_probe_previous_day");
    expect(sink.current?.anchor.isUsingCachedSettledAnchor).toBe(true);
    expect(sink.current?.dashOuraEnabled).toBe(true);

    const callsDuringProbeLoading = mockGetOuraSleepView.mock.calls.filter((c) => c[0] === ANCHOR).length;
    expect(callsDuringProbeLoading).toBe(callsAfterSettled);

    await act(async () => {
      resolveMainSleep({
        ok: true,
        status: 200,
        requestId: null,
        json: { ...mockOvernightProbeView, requestedDay: ANCHOR, resolvedDay: ANCHOR, isFallback: false },
      });
      await Promise.resolve();
    });
  });
});
