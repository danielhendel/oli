// lib/util/__tests__/makeFactId.test.ts
import { makeFactId } from "../../util/makeFactId";

describe("makeFactId", () => {
  it("lowercases kind and concatenates with date", () => {
    expect(makeFactId("Weekly.Summary.Workout", "2025-09-06"))
      .toBe("weekly.summary.workout:2025-09-06");
  });
});
