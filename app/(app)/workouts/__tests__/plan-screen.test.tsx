import fs from "node:fs";
import path from "node:path";
import React from "react";
import renderer, { act } from "react-test-renderer";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useNavigation: () => ({ setOptions: jest.fn(), goBack: jest.fn() }),
  useRouter: () => ({ push: mockPush }),
}));

import WorkoutsPlanScreen from "../plan";

describe("WorkoutsPlanScreen (Strength Plan hub)", () => {
  const planSourcePath = path.join(__dirname, "../plan.tsx");

  beforeEach(() => {
    mockPush.mockClear();
  });

  it("source file does not import Firebase or API client modules", () => {
    const src = fs.readFileSync(planSourcePath, "utf8");
    expect(src).not.toMatch(/from\s+["']@\/lib\/api\//);
    expect(src).not.toMatch(/from\s+["']firebase/);
    expect(src).not.toMatch(/from\s+["']@firebase\//);
  });

  it("renders hero title", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<WorkoutsPlanScreen />);
    });
    expect(JSON.stringify(tree.toJSON())).toContain("Build your strength plan");
  });

  it("Create Workout (hero) navigates to workouts create", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<WorkoutsPlanScreen />);
    });
    const btn = tree.root.findByProps({ testID: "strength-plan-hero-create-workout" });
    await act(async () => {
      btn.props.onPress();
    });
    expect(mockPush).toHaveBeenCalledWith("/(app)/workouts/create");
  });

  it("Start Strength Log navigates to workouts log", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<WorkoutsPlanScreen />);
    });
    const btn = tree.root.findByProps({ testID: "strength-plan-hero-start-log" });
    await act(async () => {
      btn.props.onPress();
    });
    expect(mockPush).toHaveBeenCalledWith("/(app)/workouts/log");
  });

  it("disabled Create Program CTA does not invoke navigation", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<WorkoutsPlanScreen />);
    });
    const btn = tree.root.findByProps({ testID: "strength-plan-create-program-disabled" });
    expect(btn.props.disabled).toBe(true);
    expect(btn.props.accessibilityState).toEqual({ disabled: true });
    if (typeof btn.props.onPress === "function") {
      await act(async () => {
        btn.props.onPress();
      });
    }
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("templates Create Workout navigates to create route", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<WorkoutsPlanScreen />);
    });
    const btn = tree.root.findByProps({ testID: "strength-plan-templates-create-workout" });
    await act(async () => {
      btn.props.onPress();
    });
    expect(mockPush).toHaveBeenCalledWith("/(app)/workouts/create");
  });

  it("exercise library CTA opens exercise picker", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<WorkoutsPlanScreen />);
    });
    const btn = tree.root.findByProps({ testID: "strength-plan-open-exercise-library" });
    await act(async () => {
      btn.props.onPress();
    });
    expect(mockPush).toHaveBeenCalledWith("/(app)/workouts/exercise-picker");
  });

  it("recent workouts CTA opens recent workouts full list", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<WorkoutsPlanScreen />);
    });
    const btn = tree.root.findByProps({ testID: "strength-plan-open-recent-workouts" });
    await act(async () => {
      btn.props.onPress();
    });
    expect(mockPush).toHaveBeenCalledWith("/(app)/workouts/recent-workouts-full");
  });
});
