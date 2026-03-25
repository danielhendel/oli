import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  clearWorkoutCalendarMarkerCache,
  loadWorkoutCalendarMarkerSnapshot,
  persistWorkoutCalendarMarkerSnapshot,
  workoutCalendarMarkerStorageKey,
} from "@/lib/data/workouts/workoutsCalendarMarkerCache";
import type { WorkoutMarkerFlags } from "@/lib/data/workouts/workoutMarkerFlags";
import type { DayKey } from "@/lib/ui/calendar/types";

describe("workoutsCalendarMarkerCache", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("round-trips markers for uid and kindsSig", async () => {
    const map = new Map<DayKey, WorkoutMarkerFlags>([
      ["2026-03-11", { hasStrength: true, hasCardio: false }],
    ]);
    await persistWorkoutCalendarMarkerSnapshot("u1", "workout,strength_workout", map, "strength");

    const loaded = await loadWorkoutCalendarMarkerSnapshot("u1", "workout,strength_workout", "strength");
    expect(loaded?.get("2026-03-11")).toEqual({ hasStrength: true, hasCardio: false });
  });

  it("returns null on uid mismatch", async () => {
    await AsyncStorage.setItem(
      workoutCalendarMarkerStorageKey("strength"),
      JSON.stringify({
        v: 1,
        uid: "other",
        kindsSig: "workout,strength_workout",
        savedAt: "2026-01-01T00:00:00.000Z",
        markers: { "2026-03-11": { hasStrength: true, hasCardio: false } },
      }),
    );
    const loaded = await loadWorkoutCalendarMarkerSnapshot("u1", "workout,strength_workout", "strength");
    expect(loaded).toBeNull();
  });

  it("clearWorkoutCalendarMarkerCache removes snapshot", async () => {
    await persistWorkoutCalendarMarkerSnapshot(
      "u1",
      "workout,strength_workout",
      new Map([["2026-01-01", { hasStrength: false, hasCardio: true }]]),
      "strength",
    );
    await clearWorkoutCalendarMarkerCache("strength");
    const loaded = await loadWorkoutCalendarMarkerSnapshot("u1", "workout,strength_workout", "strength");
    expect(loaded).toBeNull();
  });
});
