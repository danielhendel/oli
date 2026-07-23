import React, { act } from "react";
import renderer from "react-test-renderer";
import { describe, expect, it, jest, beforeEach, afterEach } from "@jest/globals";

import { useDailyMonitorRefresh } from "../useDailyMonitorRefresh";

const mockInvalidateFacts = jest.fn();
const mockScheduleRepair = jest.fn();
const mockInvalidateWorkouts = jest.fn();

jest.mock("@/lib/data/dailyFactsSessionCache", () => ({
  invalidateDailyFactsSessionCache: (...args: unknown[]) => mockInvalidateFacts(...args),
}));

jest.mock("@/lib/data/activity/appleHealthStepsRepairCoordinator", () => ({
  scheduleAppleHealthStepsRepair: (...args: unknown[]) => mockScheduleRepair(...args),
}));

jest.mock("@/lib/data/workouts/workoutCalendarHydrateInvalidate", () => ({
  invalidateWorkoutCalendarHydrate: (...args: unknown[]) => mockInvalidateWorkouts(...args),
}));

jest.mock("react-native", () => ({
  Platform: { OS: "ios" },
}));

function Harness(props: {
  onReady: (api: ReturnType<typeof useDailyMonitorRefresh>) => void;
  refetchSleep: jest.Mock;
  refetchReadiness: jest.Mock;
  refetchStress: jest.Mock;
}): null {
  const api = useDailyMonitorRefresh({
    dayKey: "2026-07-20",
    userUid: "u1",
    getIdToken: async () => "tok",
    refreshDayKey: jest.fn(),
    refetchSleep: props.refetchSleep,
    refetchReadiness: props.refetchReadiness,
    refetchStress: props.refetchStress,
  });
  React.useEffect(() => {
    props.onReady(api);
  });
  return null;
}

describe("useDailyMonitorRefresh", () => {
  const refetchSleep = jest.fn();
  const refetchReadiness = jest.fn();
  const refetchStress = jest.fn();
  let api: ReturnType<typeof useDailyMonitorRefresh> | null = null;

  beforeEach(() => {
    mockInvalidateFacts.mockClear();
    mockScheduleRepair.mockClear();
    mockInvalidateWorkouts.mockClear();
    refetchSleep.mockClear();
    refetchReadiness.mockClear();
    refetchStress.mockClear();
    api = null;
  });

  afterEach(() => {
    api = null;
  });

  function mount(): void {
    act(() => {
      renderer.create(
        <Harness
          onReady={(a) => {
            api = a;
          }}
          refetchSleep={refetchSleep}
          refetchReadiness={refetchReadiness}
          refetchStress={refetchStress}
        />,
      );
    });
  }

  it("dedupes a second pull while the first refresh is in flight", async () => {
    mount();
    expect(api).not.toBeNull();

    act(() => {
      api!.onRefresh();
      api!.onRefresh();
    });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockInvalidateFacts).toHaveBeenCalledTimes(1);
    expect(mockScheduleRepair).toHaveBeenCalledTimes(1);
    expect(mockInvalidateWorkouts).toHaveBeenCalledTimes(1);
    expect(refetchSleep).toHaveBeenCalledTimes(1);
    expect(refetchReadiness).toHaveBeenCalledTimes(1);
    expect(refetchStress).toHaveBeenCalledTimes(1);
  });

  it("allows a later pull after the in-flight refresh resolves", async () => {
    mount();
    act(() => {
      api!.onRefresh();
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    mockInvalidateFacts.mockClear();
    act(() => {
      api!.onRefresh();
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(mockInvalidateFacts).toHaveBeenCalledTimes(1);
  });

  it("does not update state after unmount", async () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <Harness
          onReady={(a) => {
            api = a;
          }}
          refetchSleep={refetchSleep}
          refetchReadiness={refetchReadiness}
          refetchStress={refetchStress}
        />,
      );
    });
    act(() => {
      api!.onRefresh();
      tree.unmount();
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    // No throw from setState on unmounted component.
    expect(mockInvalidateFacts).toHaveBeenCalled();
  });

  it("quiet focus then immediate foreground is deduped", async () => {
    mount();
    act(() => {
      api!.refreshQuiet("focus");
      api!.refreshQuiet("foreground");
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(mockInvalidateFacts).toHaveBeenCalledTimes(1);
  });
});
