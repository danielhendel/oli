import React, { act } from "react";
import renderer from "react-test-renderer";

const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
}));

jest.mock("@/lib/ui/navigation/useFloatingTabBarScrollPadding", () => ({
  useFloatingTabBarScrollPadding: (extra: number) => extra + 0,
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

import WorkoutBuilderRoute from "../workout/index";
import ProgramDesignTypeRoute from "../workout/type";
import ProgramDesignTrainingLevelRoute from "../workout/training-level";
import ProgramDesignDurationRoute from "../workout/duration";
import ProgramDesignMuscleGroupVolumeRoute from "../workout/muscle-group-volume";
import ProgramDesignWeeklySplitRoute from "../workout/weekly-split";
import { workoutProgramDesignStore } from "@/lib/data/program/workoutProgramDesignStore";
import { PROGRAM_DESIGN_MUSCLE_GROUP_ORDER } from "@/lib/data/program/workoutProgramDesignOptions";

const mountedRenderers: renderer.ReactTestRenderer[] = [];

beforeEach(() => {
  mockPush.mockClear();
  mockBack.mockClear();
  act(() => {
    workoutProgramDesignStore.reset();
  });
});

afterEach(() => {
  act(() => {
    for (const r of mountedRenderers.splice(0)) r.unmount();
  });
});

function render(element: React.ReactElement): renderer.ReactTestRenderer {
  let test!: renderer.ReactTestRenderer;
  act(() => {
    test = renderer.create(element);
  });
  mountedRenderers.push(test);
  return test;
}

function findByTestId(
  test: renderer.ReactTestRenderer,
  testID: string,
): renderer.ReactTestInstance | undefined {
  return test.root.findAll((node) => node.props?.testID === testID)[0];
}

describe("Workout Builder landing (Program Design)", () => {
  it("renders a single Program Design card with the five category rows", () => {
    const test = render(<WorkoutBuilderRoute />);
    expect(findByTestId(test, "program-design-card")).toBeTruthy();
    for (const id of ["type", "trainingLevel", "duration", "muscleGroupVolume", "weeklySplit"]) {
      expect(findByTestId(test, `program-design-row-${id}`)).toBeTruthy();
    }
    const str = JSON.stringify(test.toJSON());
    expect(str).toContain("Program Design");
    expect(str).toContain("Type");
    expect(str).toContain("Training Level");
    expect(str).toContain("Duration");
    expect(str).toContain("Muscle Group Volume");
    expect(str).toContain("Weekly Split");
  });

  it("shows 'Not set' empty states by default", () => {
    const test = render(<WorkoutBuilderRoute />);
    const rows = test.root.findAll(
      (n) =>
        typeof n.type === "string" &&
        typeof n.props?.testID === "string" &&
        n.props.testID.startsWith("program-design-row-"),
    );
    expect(rows).toHaveLength(5);
    for (const row of rows) {
      expect(row.props.accessibilityLabel).toContain("Not set");
    }
  });

  it("does NOT render the old multi-card setup layout", () => {
    const test = render(<WorkoutBuilderRoute />);
    const str = JSON.stringify(test.toJSON());
    for (const removed of [
      "Program Setup",
      "Weekly Schedule",
      "Weekly Volume Targets",
      "Exercise Prescription Preview",
      "Review & Save",
    ]) {
      expect(str).not.toContain(removed);
    }
  });

  it("reflects selected values back on the card after a selection", () => {
    const test = render(<WorkoutBuilderRoute />);
    act(() => {
      workoutProgramDesignStore.setType("hypertrophy");
      workoutProgramDesignStore.setWeeklySplitDayCount(5);
    });
    const str = JSON.stringify(test.toJSON());
    expect(str).toContain("Hypertrophy");
    expect(str).toContain("5 days configured");
  });

  it("navigates to a category setup page when a row is pressed", () => {
    const test = render(<WorkoutBuilderRoute />);
    const row = findByTestId(test, "program-design-row-type");
    act(() => {
      (row!.props.onPress as () => void)();
    });
    expect(mockPush).toHaveBeenCalledWith("/(app)/program/workout/type");
  });
});

describe("Program Design category setup pages", () => {
  it("Type page renders the five exact options", () => {
    const test = render(<ProgramDesignTypeRoute />);
    const str = JSON.stringify(test.toJSON());
    for (const label of [
      "Hypertrophy",
      "Power Lifting",
      "Strength Training",
      "Functional Training",
      "Circuit Training",
    ]) {
      expect(str).toContain(label);
    }
  });

  it("Type selection writes to the draft and navigates back", () => {
    const test = render(<ProgramDesignTypeRoute />);
    const option = findByTestId(test, "program-type-option-circuit_training");
    act(() => {
      (option!.props.onPress as () => void)();
    });
    expect(workoutProgramDesignStore.getSnapshot().type).toBe("circuit_training");
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it("Training Level page renders the five exact options", () => {
    const test = render(<ProgramDesignTrainingLevelRoute />);
    const str = JSON.stringify(test.toJSON());
    for (const label of ["Beginner", "Novice", "Intermediate", "Advanced", "Elite"]) {
      expect(str).toContain(label);
    }
  });

  it("Duration page supports 1–52 weeks", () => {
    const test = render(<ProgramDesignDurationRoute />);
    expect(findByTestId(test, "program-duration-option-1")).toBeTruthy();
    expect(findByTestId(test, "program-duration-option-52")).toBeTruthy();
    const str = JSON.stringify(test.toJSON());
    expect(str).toContain("1 week");
    expect(str).toContain("52 weeks");
  });

  it("Muscle Group Volume page includes all 20 muscle groups", () => {
    const test = render(<ProgramDesignMuscleGroupVolumeRoute />);
    for (const id of PROGRAM_DESIGN_MUSCLE_GROUP_ORDER) {
      expect(findByTestId(test, `muscle-volume-row-${id}`)).toBeTruthy();
    }
    expect(PROGRAM_DESIGN_MUSCLE_GROUP_ORDER).toHaveLength(20);
  });

  it("Weekly Split page supports choosing 2–6 days and naming each", () => {
    const test = render(<ProgramDesignWeeklySplitRoute />);
    for (const count of [2, 3, 4, 5, 6]) {
      expect(findByTestId(test, `weekly-split-day-count-${count}`)).toBeTruthy();
    }
    const pick = findByTestId(test, "weekly-split-day-count-4");
    act(() => {
      (pick!.props.onPress as () => void)();
    });
    expect(workoutProgramDesignStore.getSnapshot().weeklySplit?.dayCount).toBe(4);

    const test2 = render(<ProgramDesignWeeklySplitRoute />);
    const input = findByTestId(test2, "weekly-split-day-input-day-1");
    expect(input).toBeTruthy();
    act(() => {
      (input!.props.onChangeText as (t: string) => void)("Full Body");
    });
    expect(workoutProgramDesignStore.getSnapshot().weeklySplit?.days[0]?.name).toBe("Full Body");
  });
});
