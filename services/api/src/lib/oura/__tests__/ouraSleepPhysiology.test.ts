import {
  pickOuraSleepAverageHrvMs,
  pickOuraSleepLowestHeartRateBpm,
  sleepRecordsForPick,
} from "../ouraSleepPhysiology";

describe("ouraSleepPhysiology", () => {
  it("reads lowest_heart_rate and average_hrv from Oura sleep API snake_case", () => {
    expect(pickOuraSleepLowestHeartRateBpm({ lowest_heart_rate: 50 })).toBe(50);
    expect(pickOuraSleepAverageHrvMs({ average_hrv: 21 })).toBe(21);
  });

  it("reads camelCase fields", () => {
    expect(pickOuraSleepLowestHeartRateBpm({ lowestHeartRateBpm: 50 })).toBe(50);
    expect(pickOuraSleepAverageHrvMs({ averageHrvMs: 21 })).toBe(21);
  });

  it("reads nested payload fields", () => {
    const doc = {
      id: "s1",
      payload: { lowest_heart_rate: 50, average_hrv: 21 },
    };
    expect(sleepRecordsForPick(doc)).toHaveLength(2);
    expect(pickOuraSleepLowestHeartRateBpm(doc)).toBe(50);
    expect(pickOuraSleepAverageHrvMs(doc)).toBe(21);
  });

  it("coerces numeric strings and ignores null", () => {
    expect(pickOuraSleepLowestHeartRateBpm({ lowest_heart_rate: "50" })).toBe(50);
    expect(pickOuraSleepAverageHrvMs({ average_hrv: "21" })).toBe(21);
    expect(pickOuraSleepLowestHeartRateBpm({ lowest_heart_rate: null })).toBeUndefined();
    expect(pickOuraSleepAverageHrvMs({ average_hrv: undefined })).toBeUndefined();
  });

  it("does not infer HRV from rmssd fields on sleep doc", () => {
    expect(
      pickOuraSleepAverageHrvMs({ rmssd_5min: 99 } as Record<string, unknown>),
    ).toBeUndefined();
  });

  it("rejects out-of-range lowest HR", () => {
    expect(pickOuraSleepLowestHeartRateBpm({ lowest_heart_rate: 10 })).toBeUndefined();
    expect(pickOuraSleepLowestHeartRateBpm({ lowest_heart_rate: 300 })).toBeUndefined();
  });
});
