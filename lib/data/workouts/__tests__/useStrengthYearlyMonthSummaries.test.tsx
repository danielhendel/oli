import React, { useEffect } from "react";
import renderer, { act } from "react-test-renderer";

const mockGetWorkoutMonthSummaries = jest.fn();
jest.mock("@/lib/api/usersMe", () => ({
  getWorkoutMonthSummaries: (...args: unknown[]) => mockGetWorkoutMonthSummaries(...args),
}));

const mockGetIdToken = jest.fn();
const mockUseAuth = jest.fn();
jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => mockUseAuth(),
}));

import { useStrengthYearlyMonthSummaries } from "@/lib/data/workouts/useStrengthYearlyMonthSummaries";
import type { WorkoutMonthSummaryItemDto } from "@/lib/contracts/retrieval";

function HookProbe({
  year,
  onState,
}: {
  year: number | null;
  onState: (state: ReturnType<typeof useStrengthYearlyMonthSummaries>) => void;
}) {
  const s = useStrengthYearlyMonthSummaries(year);
  useEffect(() => {
    onState(s);
  }, [s, onState]);
  return null;
}

function makeItem(monthKey: string, strengthSessionCount: number): WorkoutMonthSummaryItemDto {
  return {
    schemaVersion: 2,
    monthKey,
    computedAt: "2026-05-24T00:00:00.000Z",
    reconcileVersion: "2",
    strengthSessionCount,
    cardioSessionCount: 0,
    strengthWeekKeys: [],
    cardioWeekKeys: [],
    strengthDurationSumCapped: 0,
    strengthDurationCountCapped: 0,
    cardioDurationSumCapped: 0,
    cardioDurationCountCapped: 0,
  } as unknown as WorkoutMonthSummaryItemDto;
}

describe("useStrengthYearlyMonthSummaries", () => {
  beforeEach(() => {
    mockGetWorkoutMonthSummaries.mockReset();
    mockGetIdToken.mockReset().mockResolvedValue("token-1");
    mockUseAuth.mockReset().mockReturnValue({
      user: { uid: "u1" },
      initializing: false,
      getIdToken: mockGetIdToken,
    });
  });

  it("does not fetch when year is null (current-year case)", async () => {
    const states: ReturnType<typeof useStrengthYearlyMonthSummaries>[] = [];
    await act(async () => {
      renderer.create(<HookProbe year={null} onState={(s) => states.push(s)} />);
    });
    expect(mockGetWorkoutMonthSummaries).not.toHaveBeenCalled();
    expect(states.at(-1)).toEqual({ status: "idle", items: [], complete: false });
  });

  it("fetches once for a prior year and surfaces the items", async () => {
    mockGetWorkoutMonthSummaries.mockResolvedValueOnce({
      ok: true,
      status: 200,
      requestId: null,
      json: { year: 2024, expectedMonthCount: 12, complete: true, items: [makeItem("2024-06", 9)] },
    });
    const states: ReturnType<typeof useStrengthYearlyMonthSummaries>[] = [];
    await act(async () => {
      renderer.create(<HookProbe year={2024} onState={(s) => states.push(s)} />);
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockGetWorkoutMonthSummaries).toHaveBeenCalledTimes(1);
    expect(mockGetWorkoutMonthSummaries).toHaveBeenCalledWith("token-1", { year: 2024 });
    const final = states.at(-1);
    expect(final?.status).toBe("ready");
    expect(final?.complete).toBe(true);
    expect(final?.items[0]?.monthKey).toBe("2024-06");
    expect(final?.items[0]?.strengthSessionCount).toBe(9);
  });

  it("caches results: re-rendering the same year does not refire the request", async () => {
    mockGetWorkoutMonthSummaries.mockResolvedValueOnce({
      ok: true,
      status: 200,
      requestId: null,
      json: { year: 2024, expectedMonthCount: 12, complete: true, items: [makeItem("2024-01", 3)] },
    });
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<HookProbe year={2024} onState={() => undefined} />);
    });
    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      tree.update(<HookProbe year={2024} onState={() => undefined} />);
      await Promise.resolve();
    });
    expect(mockGetWorkoutMonthSummaries).toHaveBeenCalledTimes(1);
  });

  it("surfaces error status when the API result is not ok", async () => {
    mockGetWorkoutMonthSummaries.mockResolvedValueOnce({
      ok: false,
      status: 500,
      requestId: null,
      json: null,
    });
    const states: ReturnType<typeof useStrengthYearlyMonthSummaries>[] = [];
    await act(async () => {
      renderer.create(<HookProbe year={2023} onState={(s) => states.push(s)} />);
    });
    await act(async () => {
      await Promise.resolve();
    });
    const final = states.at(-1);
    expect(final?.status).toBe("error");
    expect(final?.items).toEqual([]);
  });

  it("resets to idle when year transitions back to null", async () => {
    mockGetWorkoutMonthSummaries.mockResolvedValueOnce({
      ok: true,
      status: 200,
      requestId: null,
      json: { year: 2024, expectedMonthCount: 12, complete: true, items: [] },
    });
    const states: ReturnType<typeof useStrengthYearlyMonthSummaries>[] = [];
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<HookProbe year={2024} onState={(s) => states.push(s)} />);
    });
    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      tree.update(<HookProbe year={null} onState={(s) => states.push(s)} />);
      await Promise.resolve();
    });
    const final = states.at(-1);
    expect(final?.status).toBe("idle");
  });
});
