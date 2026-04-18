import { buildHealthKitGetStepCountOptions, getLocalCalendarDayBoundsFromYmd } from "../healthKit";

describe("buildHealthKitGetStepCountOptions", () => {
  it("passes local start-of-day ISO as `date` (native getStepCount ignores startDate/endDate)", () => {
    const day = "2026-04-12";
    const opts = buildHealthKitGetStepCountOptions(day);
    const { start } = getLocalCalendarDayBoundsFromYmd(day);
    expect(opts.date).toBe(start);
    expect(opts.includeManuallyAdded).toBe(true);
    expect(opts).not.toHaveProperty("startDate");
    expect(opts).not.toHaveProperty("endDate");
  });
});
