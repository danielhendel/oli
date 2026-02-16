import { WorkoutLoggedV1 } from "./events";

test("valid workout.logged v1", () => {
  const sample = {
    type: "workout.logged",
    version: "1",
    uid: "abc",
    ts: Date.now(),
    payload: { workoutId: "w1", exercises: [{ id: "e1", name: "Squat", sets: [{ reps: 5, weight: 100 }] }] }
  };
  expect(WorkoutLoggedV1.parse(sample)).toBeTruthy();
});
