import React, { act } from "react";
import renderer from "react-test-renderer";

jest.mock("@/lib/ui/navigation/useFloatingTabBarScrollPadding", () => ({
  useFloatingTabBarScrollPadding: (extra: number) => extra + 0,
}));

import WorkoutBuilderRoute from "../workout";

function render(): renderer.ReactTestRenderer {
  let test!: renderer.ReactTestRenderer;
  act(() => {
    test = renderer.create(<WorkoutBuilderRoute />);
  });
  return test;
}

describe("Workout Builder route", () => {
  it("renders all six builder sections", () => {
    const test = render();
    for (const id of [
      "workout-setup-card",
      "workout-schedule-card",
      "workout-volume-targets-card",
      "workout-days-card",
      "workout-exercise-preview-card",
      "workout-review-card",
    ]) {
      expect(test.root.findByProps({ testID: id })).toBeTruthy();
    }

    const str = JSON.stringify(test.toJSON());
    expect(str).toContain("Program Setup");
    expect(str).toContain("Weekly Schedule");
    expect(str).toContain("Weekly Volume Targets");
    expect(str).toContain("Workout Days");
    expect(str).toContain("Exercise Prescription Preview");
    expect(str).toContain("Review & Save");
  });

  it("renders the seed schedule, volume targets, and example prescriptions", () => {
    const test = render();
    const str = JSON.stringify(test.toJSON());
    // schedule
    expect(str).toContain("Upper A");
    expect(str).toContain("Lower B");
    expect(str).toContain("Full Body + VO₂");
    // volume targets (split delts)
    expect(str).toContain("Side Delts");
    expect(str).toContain("Rear Delts");
    // example exercises + prescription fields
    expect(str).toContain("Incline DB Press");
    expect(str).toContain("Hack Squat");
    expect(str).toContain("RIR");
  });

  it("renders Save Program as disabled / coming soon", () => {
    const test = render();
    const cta = test.root.findByProps({ testID: "workout-save-cta" });
    expect(cta.props.accessibilityState).toEqual({ disabled: true });
    expect(JSON.stringify(test.toJSON())).toContain("Saving is coming soon");
  });
});
