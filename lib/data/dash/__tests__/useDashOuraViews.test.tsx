import React from "react";
import renderer, { act } from "react-test-renderer";

import type { SleepViewDto } from "@oli/contracts";

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

import { useDashOuraViews } from "../useDashOuraViews";

const alignedSleep: SleepViewDto = {
  requestedDay: "2026-05-01",
  resolvedDay: "2026-05-01",
  isFallback: false,
  day: "2026-05-01",
  score: 96,
  contributors: {},
};

function Harness({
  sink,
  enabled,
}: {
  sink: React.MutableRefObject<ReturnType<typeof useDashOuraViews> | null>;
  enabled?: boolean;
}): null {
  const s = useDashOuraViews("2026-05-01", { enabled });
  sink.current = s;
  return null;
}

describe("useDashOuraViews", () => {
  beforeEach(() => {
    mockGetOuraSleepView.mockReset();
    mockGetOuraReadinessView.mockReset();
  });

  it("calls getOuraSleepView immediately and does not block sleepView on readiness", async () => {
    mockGetOuraSleepView.mockResolvedValue({
      ok: true,
      status: 200,
      requestId: null,
      json: alignedSleep,
    });
    mockGetOuraReadinessView.mockImplementation(
      () =>
        new Promise(() => {
          /* never resolves */
        }),
    );

    const sink: React.MutableRefObject<ReturnType<typeof useDashOuraViews> | null> = { current: null };

    await act(async () => {
      renderer.create(<Harness sink={sink} />);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockGetOuraSleepView).toHaveBeenCalledWith("2026-05-01", "id-token", undefined);
    expect(mockGetOuraReadinessView).toHaveBeenCalled();

    const last = sink.current;
    expect(last).not.toBeNull();
    expect(last!.sleepView?.score).toBe(96);
    expect(last!.sleepViewLoading).toBe(false);
    expect(last!.readinessViewLoading).toBe(true);
    expect(last!.loading).toBe(true);
  });

  it("skips network when enabled is false", async () => {
    const sink: React.MutableRefObject<ReturnType<typeof useDashOuraViews> | null> = { current: null };

    await act(async () => {
      renderer.create(<Harness sink={sink} enabled={false} />);
      await Promise.resolve();
    });

    expect(mockGetOuraSleepView).not.toHaveBeenCalled();
    expect(mockGetOuraReadinessView).not.toHaveBeenCalled();
    expect(sink.current?.sleepViewLoading).toBe(false);
    expect(sink.current?.readinessViewLoading).toBe(false);
  });

  it("logs [DASH_OURA_SLEEP_FETCH_DONE] in finally with cancelled when enabled goes false mid-flight", async () => {
    const logSpy = jest.spyOn(console, "log").mockImplementation((() => undefined) as (...args: unknown[]) => void);

    let resolveSleep!: (v: unknown) => void;
    mockGetOuraSleepView.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSleep = resolve;
        }),
    );
    mockGetOuraReadinessView.mockResolvedValue({
      ok: true,
      status: 200,
      requestId: null,
      json: {
        requestedDay: "2026-05-01",
        resolvedDay: "2026-05-01",
        isFallback: false,
        day: "2026-05-01",
        score: 1,
        contributors: {},
      },
    });

    const sink: React.MutableRefObject<ReturnType<typeof useDashOuraViews> | null> = { current: null };
    let root: renderer.ReactTestRenderer;

    await act(async () => {
      root = renderer.create(<Harness sink={sink} enabled />);
      await Promise.resolve();
    });

    await act(async () => {
      root.update(<Harness sink={sink} enabled={false} />);
      await Promise.resolve();
    });

    await act(async () => {
      resolveSleep({
        ok: true,
        status: 200,
        requestId: null,
        json: alignedSleep,
      });
      await Promise.resolve();
    });

    const doneArg = logSpy.mock.calls.find((c) => c[0] === "[DASH_OURA_SLEEP_FETCH_DONE]")?.[1] as
      | { cancelled?: boolean; stale?: boolean }
      | undefined;
    expect(doneArg?.cancelled).toBe(true);
    expect(doneArg?.stale).toBe(true);

    logSpy.mockRestore();
  });
});
