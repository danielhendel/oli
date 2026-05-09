// app/(app)/__tests__/fitness-goals.test.tsx
import React, { act } from "react";
import renderer from "react-test-renderer";

const mockBack = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ back: mockBack, push: jest.fn() }),
}));

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({ user: { uid: "u1" }, initializing: false, getIdToken: jest.fn() }),
}));

const mockSetWeeklyFitnessGoals = jest.fn(async () => true);
let mockPrefState: {
  status: "ready" | "partial" | "error";
  preferences: Record<string, unknown>;
  message?: string;
} = {
  status: "ready",
  preferences: {
    units: { mass: "lb" },
    timezone: { mode: "recorded" },
    selectedGymId: null,
    metricSources: {},
  },
};

jest.mock("@/lib/preferences/PreferencesProvider", () => ({
  usePreferences: () => ({
    state: mockPrefState,
    setWeeklyFitnessGoals: mockSetWeeklyFitnessGoals,
  }),
}));

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  ActivityIndicator: "ActivityIndicator",
  TextInput: "TextInput",
  StyleSheet: { create: (s: unknown) => s, hairlineWidth: 1 },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const FitnessGoalsScreen = require("../fitness-goals").default;

function findInputByTestId(tree: renderer.ReactTestRenderer, id: string) {
  return tree.root.findByProps({ testID: id });
}

function collectAllText(tree: renderer.ReactTestRenderer): string {
  return tree.root
    .findAllByType("Text")
    .map((n) =>
      (n.children as (string | number)[])
        .filter((c) => typeof c === "string" || typeof c === "number")
        .join(""),
    )
    .join(" ");
}

describe("FitnessGoalsScreen", () => {
  beforeEach(() => {
    mockBack.mockReset();
    mockSetWeeklyFitnessGoals.mockReset();
    mockSetWeeklyFitnessGoals.mockImplementation(async () => true);
    mockPrefState = {
      status: "ready",
      preferences: {
        units: { mass: "lb" },
        timezone: { mode: "recorded" },
        selectedGymId: null,
        metricSources: {},
      },
    };
  });

  it("renders with Phase 1 defaults when no goals are persisted", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<FitnessGoalsScreen />);
    });
    expect(findInputByTestId(tree, "fitness-goals-input-activityStepsPerDayGoal").props.value).toBe(
      "10000",
    );
    expect(
      findInputByTestId(tree, "fitness-goals-input-strengthWorkoutsPerWeekGoal").props.value,
    ).toBe("5");
    expect(
      findInputByTestId(tree, "fitness-goals-input-cardioMilesPerWeekGoal").props.value,
    ).toBe("10");
  });

  it("prefills from persisted goals", () => {
    mockPrefState = {
      status: "ready",
      preferences: {
        units: { mass: "lb" },
        timezone: { mode: "recorded" },
        selectedGymId: null,
        metricSources: {},
        weeklyFitnessGoals: {
          activityStepsPerDayGoal: 12000,
          strengthWorkoutsPerWeekGoal: 4,
          cardioMilesPerWeekGoal: 6,
          updatedAt: "2026-05-07T12:00:00.000Z",
        },
      },
    };
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<FitnessGoalsScreen />);
    });
    expect(findInputByTestId(tree, "fitness-goals-input-activityStepsPerDayGoal").props.value).toBe(
      "12000",
    );
    expect(
      findInputByTestId(tree, "fitness-goals-input-strengthWorkoutsPerWeekGoal").props.value,
    ).toBe("4");
    expect(
      findInputByTestId(tree, "fitness-goals-input-cardioMilesPerWeekGoal").props.value,
    ).toBe("6");
  });

  it("validates bad input and surfaces field-level errors", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<FitnessGoalsScreen />);
    });
    const stepsInput = findInputByTestId(tree, "fitness-goals-input-activityStepsPerDayGoal");
    act(() => {
      stepsInput.props.onChangeText("0");
    });
    const milesInput = findInputByTestId(tree, "fitness-goals-input-cardioMilesPerWeekGoal");
    act(() => {
      milesInput.props.onChangeText("250");
    });
    const save = findInputByTestId(tree, "fitness-goals-save");
    act(() => {
      save.props.onPress();
    });
    expect(mockSetWeeklyFitnessGoals).not.toHaveBeenCalled();
    expect(tree.root.findAllByProps({ testID: "fitness-goals-error-activityStepsPerDayGoal" }).length).toBe(1);
    expect(tree.root.findAllByProps({ testID: "fitness-goals-error-cardioMilesPerWeekGoal" }).length).toBe(1);
  });

  it("saves valid input via setWeeklyFitnessGoals", async () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<FitnessGoalsScreen />);
    });
    const stepsInput = findInputByTestId(tree, "fitness-goals-input-activityStepsPerDayGoal");
    act(() => {
      stepsInput.props.onChangeText("12000");
    });
    const workoutsInput = findInputByTestId(tree, "fitness-goals-input-strengthWorkoutsPerWeekGoal");
    act(() => {
      workoutsInput.props.onChangeText("4");
    });
    const milesInput = findInputByTestId(tree, "fitness-goals-input-cardioMilesPerWeekGoal");
    act(() => {
      milesInput.props.onChangeText("8");
    });
    const save = findInputByTestId(tree, "fitness-goals-save");
    await act(async () => {
      await save.props.onPress();
    });
    expect(mockSetWeeklyFitnessGoals).toHaveBeenCalledWith({
      activityStepsPerDayGoal: 12000,
      strengthWorkoutsPerWeekGoal: 4,
      cardioMilesPerWeekGoal: 8,
    });
  });

  it("shows server error when setWeeklyFitnessGoals leaves state in error", async () => {
    mockSetWeeklyFitnessGoals.mockImplementation(async () => {
      mockPrefState = {
        status: "error",
        preferences: mockPrefState.preferences,
        message: "boom (kind=NETWORK, status=500, requestId=r1)",
      };
      return false;
    });

    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<FitnessGoalsScreen />);
    });
    const save = findInputByTestId(tree, "fitness-goals-save");
    await act(async () => {
      await save.props.onPress();
    });
    // Re-render to pick up new mock state
    act(() => {
      tree.update(<FitnessGoalsScreen />);
    });
    expect(collectAllText(tree)).toContain("Couldn’t save goals");
  });
});
