import {
  isResumableWorkoutSession,
  isResumableWorkoutSessionStatus,
} from "../selectors";

describe("sessionEngine selectors resumable status", () => {
  it("marks only draft/planned/active as resumable", () => {
    expect(isResumableWorkoutSessionStatus("draft")).toBe(true);
    expect(isResumableWorkoutSessionStatus("planned")).toBe(true);
    expect(isResumableWorkoutSessionStatus("active")).toBe(true);
    expect(isResumableWorkoutSessionStatus("completed")).toBe(false);
    expect(isResumableWorkoutSessionStatus("abandoned")).toBe(false);
    expect(isResumableWorkoutSessionStatus("archived")).toBe(false);
  });

  it("derives resumability strictly from canonical status", () => {
    expect(isResumableWorkoutSession({ status: "active" })).toBe(true);
    expect(isResumableWorkoutSession({ status: "draft" })).toBe(true);
    expect(isResumableWorkoutSession({ status: "planned" })).toBe(true);
    expect(isResumableWorkoutSession({ status: "abandoned" })).toBe(false);
  });
});
