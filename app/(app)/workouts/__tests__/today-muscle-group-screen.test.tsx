import React from "react";
import renderer, { act } from "react-test-renderer";

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  ScrollView: "ScrollView",
  StyleSheet: { create: (s: unknown) => s, hairlineWidth: 1 },
}));

const mockBack = jest.fn();
const mockUseLocalSearchParams = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ back: mockBack }),
  useLocalSearchParams: () => mockUseLocalSearchParams(),
}));

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ setOptions: jest.fn() }),
}));

import StrengthTodayMuscleGroupSheet, {
  buildStrengthTodayMuscleGroupRouteParams,
} from "../today-muscle-group";

describe("StrengthTodayMuscleGroupSheet", () => {
  beforeEach(() => {
    mockBack.mockClear();
    mockUseLocalSearchParams.mockReset();
  });

  it("renders muscle title, total working sets, and contributing exercises", async () => {
    mockUseLocalSearchParams.mockReturnValue({
      muscleGroup: "back",
      totalSets: "9",
      exercises: JSON.stringify([
        { exerciseName: "Pull Up", setCount: 4 },
        { exerciseName: "Barbell Row", setCount: 3 },
        { exerciseName: "Lat Pulldown", setCount: 2 },
      ]),
    });

    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<StrengthTodayMuscleGroupSheet />);
    });
    const json = JSON.stringify(tree!.toJSON());
    expect(json).toContain("Back");
    expect(json).toContain("9 working sets");
    expect(json).toContain("Pull Up");
    expect(json).toContain("Barbell Row");
    expect(json).toContain("Lat Pulldown");
    expect(json).toContain("4 sets");
    expect(json).toContain("3 sets");
    expect(json).toContain("2 sets");
    expect(mockBack).not.toHaveBeenCalled();
  });

  it("uses singular 'set' for total when exactly 1", async () => {
    mockUseLocalSearchParams.mockReturnValue({
      muscleGroup: "biceps",
      totalSets: "1",
      exercises: JSON.stringify([{ exerciseName: "Hammer Curl", setCount: 1 }]),
    });
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<StrengthTodayMuscleGroupSheet />);
    });
    expect(JSON.stringify(tree!.toJSON())).toContain("1 working set");
  });

  it("closes the sheet when muscleGroup or totalSets are missing", async () => {
    mockUseLocalSearchParams.mockReturnValue({});
    await act(async () => {
      renderer.create(<StrengthTodayMuscleGroupSheet />);
    });
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it("rejects unknown muscle groups", async () => {
    mockUseLocalSearchParams.mockReturnValue({
      muscleGroup: "not_a_muscle",
      totalSets: "3",
      exercises: "[]",
    });
    await act(async () => {
      renderer.create(<StrengthTodayMuscleGroupSheet />);
    });
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it("ignores malformed exercise rows without crashing", async () => {
    mockUseLocalSearchParams.mockReturnValue({
      muscleGroup: "chest",
      totalSets: "2",
      exercises: JSON.stringify([
        { exerciseName: "Bench Press", setCount: 2 },
        { exerciseName: "", setCount: 5 },
        { exerciseName: "No Sets", setCount: 0 },
        { exerciseName: "Bad", setCount: "not a number" },
        null,
      ]),
    });
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<StrengthTodayMuscleGroupSheet />);
    });
    const json = JSON.stringify(tree!.toJSON());
    expect(json).toContain("Bench Press");
    expect(json).not.toContain("No Sets");
    expect(json).not.toContain("Bad");
  });
});

describe("buildStrengthTodayMuscleGroupRouteParams", () => {
  it("serializes exercises as JSON and stringifies the count", () => {
    const params = buildStrengthTodayMuscleGroupRouteParams({
      muscleGroup: "back",
      totalSetCount: 9,
      exercises: [
        { exerciseName: "Pull Up", setCount: 4 },
        { exerciseName: "Barbell Row", setCount: 3 },
      ],
    });
    expect(params.muscleGroup).toBe("back");
    expect(params.totalSets).toBe("9");
    expect(JSON.parse(params.exercises)).toEqual([
      { exerciseName: "Pull Up", setCount: 4 },
      { exerciseName: "Barbell Row", setCount: 3 },
    ]);
  });
});
