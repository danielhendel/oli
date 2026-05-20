import {
  exitLiveWorkoutLogToOverview,
  navigateLiveWorkoutFinishToNameScreen,
} from "../exitWorkoutLogFlow";

describe("exitLiveWorkoutLogToOverview", () => {
  it("dismisses to workouts overview route", () => {
    const dismissTo = jest.fn();

    exitLiveWorkoutLogToOverview({ dismissTo });

    expect(dismissTo).toHaveBeenCalledTimes(1);
    expect(dismissTo).toHaveBeenCalledWith("/(app)/workouts");
  });
});

describe("navigateLiveWorkoutFinishToNameScreen", () => {
  it("pushes rename screen in finish mode with workout id and title anchor", () => {
    const push = jest.fn();

    navigateLiveWorkoutFinishToNameScreen(
      { dismissTo: jest.fn(), push },
      { workoutId: "w1", titleAnchorObservedAt: "2026-03-01T10:00:00.000Z" },
    );

    expect(push).toHaveBeenCalledWith({
      pathname: "/(app)/workouts/edit/rename",
      params: {
        mode: "finish",
        workoutId: "w1",
        titleAnchorObservedAt: "2026-03-01T10:00:00.000Z",
      },
    });
  });
});
