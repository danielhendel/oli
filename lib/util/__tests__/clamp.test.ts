import { clamp } from "../clamp";

describe("clamp", () => {
  it("returns value when within range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it("floors to min when below", () => {
    expect(clamp(-3, 0, 10)).toBe(0);
  });

  it("caps to max when above", () => {
    expect(clamp(42, 0, 10)).toBe(10);
  });

  it("throws if min > max", () => {
    expect(() => clamp(1, 10, 0)).toThrow(/min cannot be greater than max/i);
  });
});
