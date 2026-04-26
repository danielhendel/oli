import React from "react";
import renderer, { act } from "react-test-renderer";
import { allowConsoleForThisTest } from "../../../../scripts/test/consoleGuard";

const mockReplace = jest.fn();
const mockBack = jest.fn();

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  TextInput: "TextInput",
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  StyleSheet: { create: (s: unknown) => s, hairlineWidth: 1 },
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace, back: mockBack }),
  useNavigation: () => ({ setOptions: jest.fn() }),
  useLocalSearchParams: () => ({ sessionId: "s1" }),
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: function SafeAreaViewMock({ children }: { children: React.ReactNode }) {
    const React = require("react");
    return React.createElement("View", { testID: "safe-area" }, children);
  },
}));

jest.mock("@/lib/ui/headers/WorkoutsNavBar", () => ({
  WorkoutsNavBar: function WorkoutsNavBarMock({
    title,
    onBackPress,
  }: {
    title?: string;
    onBackPress: () => void;
  }) {
    const React = require("react");
    const { Pressable, Text, View } = require("react-native");
    return React.createElement(View, { testID: "workouts-navbar" }, [
      React.createElement(Pressable, { key: "back", onPress: onBackPress, accessibilityLabel: "Back" }),
      React.createElement(Text, { key: "title" }, title ?? ""),
    ]);
  },
}));

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: { uid: "u1" },
    initializing: false,
    getIdToken: jest.fn().mockResolvedValue(null),
  }),
}));

const mockCreateCustomExercise = jest.fn();
jest.mock("@/lib/workouts/exercises/customExerciseStore", () => ({
  createCustomExercise: (...args: unknown[]) => mockCreateCustomExercise(...args),
}));

const mockCreateExerciseDefinition = jest.fn();
jest.mock("@/lib/api/exerciseDefinitions", () => ({
  createExerciseDefinition: (...args: unknown[]) => mockCreateExerciseDefinition(...args),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const ExerciseCreateScreen = require("../exercise-create").default;

function findByA11yLabel(
  root: renderer.ReactTestRenderer["root"],
  label: string,
): renderer.ReactTestInstance | null {
  const pressables = root.findAllByType("Pressable");
  return pressables.find((p) => p.props.accessibilityLabel === label) ?? null;
}

describe("workouts/exercise-create", () => {
  let test: renderer.ReactTestRenderer | null = null;

  beforeEach(() => {
    allowConsoleForThisTest({ error: [/act\(\.\.\.\)/, /not wrapped in act/] });
    mockReplace.mockClear();
    mockCreateCustomExercise.mockReset();
    mockCreateExerciseDefinition.mockReset();
    mockCreateCustomExercise.mockResolvedValue({
      exerciseId: "custom_u1_push_press",
      name: "Push Press",
      equipment: "Barbell",
      primary: "Shoulders",
      loggingType: "weight_reps",
    });
  });

  afterEach(() => {
    const t = test;
    test = null;
    if (t != null) {
      act(() => {
        t.unmount();
      });
    }
  });

  it("does not render raw route title text", () => {
    act(() => {
      test = renderer.create(<ExerciseCreateScreen />);
    });
    const texts = test!.root
      .findAllByType("Text")
      .map((t) => (typeof t.props.children === "string" ? t.props.children : ""));
    expect(texts).not.toContain("workouts/exercise-create");
  });

  it("header has no center title; page content keeps Create exercise title", () => {
    act(() => {
      test = renderer.create(<ExerciseCreateScreen />);
    });
    const texts = test!.root
      .findAllByType("Text")
      .map((t) => (typeof t.props.children === "string" ? t.props.children : ""));
    const titleCount = texts.filter((s) => s === "Create exercise").length;
    expect(titleCount).toBe(1);
  });

  it("does not render old create card wrapper", () => {
    act(() => {
      test = renderer.create(<ExerciseCreateScreen />);
    });
    const viewNodes = test!.root.findAllByType("View");
    const cardLike = viewNodes.find((node) => node.props.style?.borderRadius === 14);
    expect(cardLike).toBeUndefined();
  });

  it("save exercise still creates and routes back to workout log", async () => {
    act(() => {
      test = renderer.create(<ExerciseCreateScreen />);
    });
    const nameInput = test!.root.findByProps({ accessibilityLabel: "Exercise name" });
    act(() => {
      nameInput.props.onChangeText("Push Press");
    });
    const save = findByA11yLabel(test!.root, "Save exercise");
    expect(save).not.toBeNull();
    await act(async () => {
      save!.props.onPress();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(mockCreateCustomExercise).toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: "/(app)/workouts/log",
      params: {
        sessionId: "s1",
        pickedExerciseId: "custom_u1_push_press",
      },
    });
  });
});
