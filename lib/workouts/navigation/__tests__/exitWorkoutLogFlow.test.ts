import { exitLiveWorkoutLogToOverview } from "../exitWorkoutLogFlow";

describe("exitLiveWorkoutLogToOverview", () => {
  it("dismisses to workouts overview route", () => {
    const dismissTo = jest.fn();

    exitLiveWorkoutLogToOverview({ dismissTo });

    expect(dismissTo).toHaveBeenCalledTimes(1);
    expect(dismissTo).toHaveBeenCalledWith("/(app)/workouts");
  });
});
