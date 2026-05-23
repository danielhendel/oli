import React from "react";
import { act } from "react";
import renderer from "react-test-renderer";
import { describe, it, expect, jest, beforeEach } from "@jest/globals";

import { useDailyFacts } from "@/lib/data/useDailyFacts";
import { useActivityTodayStepsAllocation } from "@/lib/data/activity/useActivityTodayStepsAllocation";

jest.mock("@/lib/data/useDailyFacts", () => ({
  useDailyFacts: jest.fn(),
}));

const mockUseDailyFacts = useDailyFacts as jest.MockedFunction<typeof useDailyFacts>;

type HookResult = ReturnType<typeof useActivityTodayStepsAllocation>;

function Harness({ probe }: { probe: { current: HookResult | null } }) {
  probe.current = useActivityTodayStepsAllocation("2026-04-14");
  return null;
}

function readState(): HookResult {
  const probe: { current: HookResult | null } = { current: null };
  act(() => {
    renderer.create(<Harness probe={probe} />);
  });
  if (probe.current == null) throw new Error("hook did not produce state");
  return probe.current;
}

describe("useActivityTodayStepsAllocation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns partial when DailyFacts is loading", () => {
    mockUseDailyFacts.mockReturnValue({ status: "partial", refetch: jest.fn() });
    expect(readState()).toEqual({ status: "partial" });
  });

  it("returns missing when DailyFacts is missing", () => {
    mockUseDailyFacts.mockReturnValue({ status: "missing", refetch: jest.fn() });
    expect(readState()).toEqual({ status: "missing" });
  });

  it("returns error when DailyFacts errors", () => {
    mockUseDailyFacts.mockReturnValue({
      status: "error",
      error: "boom",
      requestId: "rid",
      refetch: jest.fn(),
    });
    expect(readState()).toEqual({ status: "error" });
  });

  it("returns ready with undefined allocation when DailyFacts has no stepsAllocation", () => {
    mockUseDailyFacts.mockReturnValue({
      status: "ready",
      data: {
        schemaVersion: 1,
        userId: "u1",
        date: "2026-04-14",
        computedAt: "2026-04-15T03:00:00.000Z",
        activity: { steps: 5000 },
      },
      refetch: jest.fn(),
    });
    const state = readState();
    expect(state.status).toBe("ready");
    if (state.status !== "ready") throw new Error("expected ready");
    expect(state.allocation).toBeUndefined();
    expect(state.allocationTotalSteps).toBe(5000);
  });

  it("returns ready with allocation buckets when DailyFacts provides stepsAllocation", () => {
    mockUseDailyFacts.mockReturnValue({
      status: "ready",
      data: {
        schemaVersion: 1,
        userId: "u1",
        date: "2026-04-14",
        computedAt: "2026-04-15T03:00:00.000Z",
        activity: {
          steps: 10000,
          stepsAllocation: {
            modelVersion: "activity_steps_allocation_v1",
            neatSteps: 5500,
            strengthSteps: 0,
            cardioSteps: 4500,
            inputsUsed: ["activity.steps", "workout.steps", "workout.classifiedCardio"],
            inputsMissing: [],
          },
        },
      },
      refetch: jest.fn(),
    });
    const state = readState();
    expect(state.status).toBe("ready");
    if (state.status !== "ready") throw new Error("expected ready");
    expect(state.allocation).toEqual({
      neatSteps: 5500,
      strengthSteps: 0,
      cardioSteps: 4500,
    });
    expect(state.allocationTotalSteps).toBe(10000);
  });

  it("returns ready with undefined total when activity.steps is missing", () => {
    mockUseDailyFacts.mockReturnValue({
      status: "ready",
      data: {
        schemaVersion: 1,
        userId: "u1",
        date: "2026-04-14",
        computedAt: "2026-04-15T03:00:00.000Z",
      },
      refetch: jest.fn(),
    });
    const state = readState();
    expect(state.status).toBe("ready");
    if (state.status !== "ready") throw new Error("expected ready");
    expect(state.allocation).toBeUndefined();
    expect(state.allocationTotalSteps).toBeUndefined();
  });
});
