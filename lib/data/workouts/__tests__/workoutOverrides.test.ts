import React from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import renderer, { act } from "react-test-renderer";
import {
  clearWorkoutOverride,
  getWorkoutOverride,
  setWorkoutOverride,
  useWorkoutOverrides,
} from "@/lib/data/workouts/workoutOverrides";

describe("workoutOverrides storage", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("saves and reads override roundtrip", async () => {
    await setWorkoutOverride("w1", {
      customTitle: "Renamed Workout",
      correctedDurationMinutes: 42,
      correctedWorkoutType: "strength",
    });

    const found = await getWorkoutOverride("w1");
    expect(found).toBeTruthy();
    expect(found?.customTitle).toBe("Renamed Workout");
    expect(found?.correctedDurationMinutes).toBe(42);
    expect(found?.correctedWorkoutType).toBe("strength");
  });

  it("partial updates preserve existing fields", async () => {
    await setWorkoutOverride("w2", {
      customTitle: "Original Name",
      correctedDurationMinutes: 20,
    });
    await setWorkoutOverride("w2", {
      correctedWorkoutType: "cardio",
    });
    const found = await getWorkoutOverride("w2");
    expect(found?.customTitle).toBe("Original Name");
    expect(found?.correctedDurationMinutes).toBe(20);
    expect(found?.correctedWorkoutType).toBe("cardio");
  });

  it("clears stored override", async () => {
    await setWorkoutOverride("w3", { customTitle: "Temp" });
    await clearWorkoutOverride("w3");
    const found = await getWorkoutOverride("w3");
    expect(found).toBeNull();
  });

  it("useWorkoutOverrides handles empty workout id list", async () => {
    function Probe() {
      const { loaded, overridesByWorkoutId } = useWorkoutOverrides([]);
      return loaded ? JSON.stringify(overridesByWorkoutId) : "loading";
    }

    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(React.createElement(Probe));
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(tree.toJSON()).toBe("{}");
  });
});
