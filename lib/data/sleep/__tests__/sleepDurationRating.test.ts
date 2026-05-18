import { describe, expect, it } from "@jest/globals";

import {
  sleepDurationProgressFill01,
  sleepDurationRatingFromMinutes,
} from "@/lib/data/sleep/sleepDurationRating";

describe("sleepDurationRatingFromMinutes", () => {
  it("maps duration tiers at 8h, 7h, 6h boundaries", () => {
    expect(sleepDurationRatingFromMinutes(8 * 60)).toBe("Optimal");
    expect(sleepDurationRatingFromMinutes(8 * 60 - 1)).toBe("Good");
    expect(sleepDurationRatingFromMinutes(7 * 60)).toBe("Good");
    expect(sleepDurationRatingFromMinutes(7 * 60 - 1)).toBe("Fair");
    expect(sleepDurationRatingFromMinutes(6 * 60)).toBe("Fair");
    expect(sleepDurationRatingFromMinutes(6 * 60 - 1)).toBe("Low");
  });
});

describe("sleepDurationProgressFill01", () => {
  it("clamps progress to 8h target", () => {
    expect(sleepDurationProgressFill01(4 * 60)).toBe(0.5);
    expect(sleepDurationProgressFill01(8 * 60)).toBe(1);
    expect(sleepDurationProgressFill01(10 * 60)).toBe(1);
    expect(sleepDurationProgressFill01(0)).toBe(0);
  });
});
