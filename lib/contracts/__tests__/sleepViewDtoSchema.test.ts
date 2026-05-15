import { sleepViewDtoSchema } from "../ouraVendor";

describe("sleepViewDtoSchema", () => {
  it("accepts score as JSON number", () => {
    const parsed = sleepViewDtoSchema.safeParse({
      requestedDay: "2025-03-15",
      resolvedDay: "2025-03-15",
      isFallback: false,
      day: "2025-03-15",
      score: 82,
      contributors: {},
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.score).toBe(82);
  });

  it("coerces digit-string score to number at the trust boundary", () => {
    const parsed = sleepViewDtoSchema.safeParse({
      requestedDay: "2025-03-15",
      resolvedDay: "2025-03-15",
      isFallback: false,
      day: "2025-03-15",
      score: "96",
      contributors: {},
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.score).toBe(96);
  });

  it("maps JSON null score to undefined (no numeric score)", () => {
    const parsed = sleepViewDtoSchema.safeParse({
      requestedDay: "2025-03-15",
      resolvedDay: "2025-03-15",
      isFallback: false,
      day: "2025-03-15",
      score: null,
      contributors: {},
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.score).toBeUndefined();
  });
});
