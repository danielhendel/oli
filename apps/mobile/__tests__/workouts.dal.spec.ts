/**
 * Purpose: Unit test for computeTotalVolume (fast suite).
 */
import { computeTotalVolume } from "../lib/types/workout";

describe("computeTotalVolume", () => {
  it("sums weight*reps across sets", () => {
    const vol = computeTotalVolume([
      {
        id: "s1",
        type: "Set",
        title: "A",
        exercises: [
          { id: "e1", name: "Bench", muscleGroup: "chest", movementType: "compound", sets: [{ reps: 10, weight: 100 }] },
          { id: "e2", name: "Fly", muscleGroup: "chest", movementType: "isolation", sets: [{ reps: 12, weight: 30 }] },
        ],
      },
    ]);
    expect(vol).toBe(1000 + 360);
  });
});
