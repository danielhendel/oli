import React from "react";
import renderer, { act } from "react-test-renderer";
import EditWorkoutRenameScreen from "../edit/rename";
import EditWorkoutDurationScreen from "../edit/duration";
import EditWorkoutTypeScreen from "../edit/type";

const mockBack = jest.fn();
const mockSaveOverride = jest.fn(async () => undefined);
const mockUseLocalSearchParams = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ back: mockBack }),
  useLocalSearchParams: () => mockUseLocalSearchParams(),
  useNavigation: () => ({
    setOptions: jest.fn(),
    goBack: mockBack,
  }),
}));

jest.mock("@/lib/data/workouts/workoutOverrides", () => ({
  useWorkoutOverrides: () => ({
    loaded: true,
    overridesByWorkoutId: {},
    saveOverride: mockSaveOverride,
    reload: jest.fn(),
  }),
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
}));

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
  TextInput: "TextInput",
  StyleSheet: { create: (s: unknown) => s, hairlineWidth: 1 },
  Alert: { alert: jest.fn() },
}));

describe("workout edit screens", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rename screen shows current and saves new name", async () => {
    mockUseLocalSearchParams.mockReturnValue({
      workoutId: "w1",
      currentTitle: "Running",
    });
    let test!: renderer.ReactTestRenderer;
    await act(async () => {
      test = renderer.create(<EditWorkoutRenameScreen />);
    });
    expect(JSON.stringify(test.toJSON())).toContain("Current");
    expect(JSON.stringify(test.toJSON())).toContain("Running");
    act(() => {
      test.root.findByProps({ accessibilityLabel: "New workout name" }).props.onChangeText("Leg Day");
    });
    await act(async () => {
      await test.root.findByProps({ accessibilityLabel: "Save" }).props.onPress();
    });
    expect(mockSaveOverride).toHaveBeenCalledWith("w1", { customTitle: "Leg Day" });
  });

  it("duration screen shows current and saves new duration", async () => {
    mockUseLocalSearchParams.mockReturnValue({
      workoutId: "w1",
      currentDurationMinutes: "30",
    });
    let test!: renderer.ReactTestRenderer;
    await act(async () => {
      test = renderer.create(<EditWorkoutDurationScreen />);
    });
    expect(JSON.stringify(test.toJSON())).toContain("30 min");
    act(() => {
      test.root.findByProps({ accessibilityLabel: "New workout duration" }).props.onChangeText("55");
    });
    await act(async () => {
      await test.root.findByProps({ accessibilityLabel: "Save" }).props.onPress();
    });
    expect(mockSaveOverride).toHaveBeenCalledWith("w1", { correctedDurationMinutes: 55 });
  });

  it("type screen shows current and saves selected type", async () => {
    mockUseLocalSearchParams.mockReturnValue({
      workoutId: "w1",
      currentWorkoutType: "cardio",
    });
    let test!: renderer.ReactTestRenderer;
    await act(async () => {
      test = renderer.create(<EditWorkoutTypeScreen />);
    });
    expect(JSON.stringify(test.toJSON())).toContain("Cardio");
    act(() => {
      test.root.findByProps({ accessibilityLabel: "Select Strength" }).props.onPress();
    });
    await act(async () => {
      await test.root.findByProps({ accessibilityLabel: "Save" }).props.onPress();
    });
    expect(mockSaveOverride).toHaveBeenCalledWith("w1", { correctedWorkoutType: "strength" });
  });
});
