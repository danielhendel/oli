// lib/util/__tests__/date.test.ts
import { toYMD, isYMD } from "../../util/date";

describe("date utils", () => {
  it("formats Date to YYYY-MM-DD", () => {
    const d = new Date("2025-01-05T12:34:56Z");
    expect(toYMD(d)).toBe("2025-01-05");
  });

  it("formats timestamp to YYYY-MM-DD", () => {
    const ts = Date.UTC(2024, 6, 9); // July 9, 2024
    expect(toYMD(ts)).toBe("2024-07-09");
  });

  it("rejects invalid inputs", () => {
    expect(() => toYMD("not-a-date")).toThrow();
  });

  it("validates YMD strings", () => {
    expect(isYMD("2024-12-31")).toBe(true);
    expect(isYMD("2024-13-01")).toBe(false);
    expect(isYMD("24-01-01")).toBe(false);
  });
});
