import { normalizeWorkout } from "../normalize";

describe("normalizeWorkout", () => {
  it("coerces sets and clamps negatives", () => {
    const out = normalizeWorkout({
      exercises: [
        { name: "Squat", sets: [{ reps: 5, weightKg: 100, rpe: 9 }] },
        { name: 123 as unknown as string, sets: [{ reps: -3, weightKg: -10, rpe: 11 }] },
      ],
    });

    expect(out.exercises.length).toBe(2);

    const ex0 = out.exercises[0]!;
    const ex1 = out.exercises[1]!;

    expect(ex0.name).toBe("Squat");
    expect(ex0.sets[0]).toEqual({ reps: 5, weightKg: 100, rpe: 9 });

    expect(ex1.name).toBe("Exercise"); // fallback name
    expect(ex1.sets[0]).toEqual({ reps: 0, weightKg: 0, rpe: 10 });
  });
});
