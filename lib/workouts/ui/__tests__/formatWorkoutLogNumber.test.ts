import { formatWorkoutLogDecimal, formatWorkoutLogInteger } from "../formatWorkoutLogNumber";

describe("formatWorkoutLogInteger", () => {
  it("groups thousands with locale commas", () => {
    expect(formatWorkoutLogInteger(2700)).toBe("2,700");
    expect(formatWorkoutLogInteger(10000)).toBe("10,000");
    expect(formatWorkoutLogInteger(1_234_567)).toBe("1,234,567");
  });

  it("leaves small values ungrouped", () => {
    expect(formatWorkoutLogInteger(0)).toBe("0");
    expect(formatWorkoutLogInteger(12)).toBe("12");
    expect(formatWorkoutLogInteger(999)).toBe("999");
  });
});

describe("formatWorkoutLogDecimal", () => {
  it("groups integer part and preserves fractional digits up to max", () => {
    expect(formatWorkoutLogDecimal(1234.5, 1)).toBe("1,234.5");
    expect(formatWorkoutLogDecimal(10000.25, 2)).toBe("10,000.25");
  });
});
