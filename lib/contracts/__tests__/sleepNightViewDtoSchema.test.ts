import { sleepNightViewDtoSchema } from "../sleepNight";

describe("sleepNightViewDtoSchema", () => {
  it("parses resolution + isFallback false", () => {
    const parsed = sleepNightViewDtoSchema.safeParse({
      requestedDay: "2026-05-13",
      anchorDay: "2026-05-12",
      wakeDay: "2026-05-13",
      resolution: "latest_completed_prior_night",
      isFallback: false,
      sleepNight: {
        anchorDay: "2026-05-12",
        wakeDay: "2026-05-13",
        provider: "oura",
        source: "ouraVendorSleep",
        sourceDocumentId: "s1",
        isComplete: true,
        score: 77,
        updatedAt: "2026-05-13T12:00:00.000Z",
      },
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.resolution).toBe("latest_completed_prior_night");
      expect(parsed.data.isFallback).toBe(false);
    }
  });

  it("parses lowestHeartRateBpm and averageHrvMs on sleepNight", () => {
    const parsed = sleepNightViewDtoSchema.safeParse({
      requestedDay: "2026-05-13",
      anchorDay: "2026-05-12",
      wakeDay: "2026-05-13",
      resolution: "latest_completed_prior_night",
      isFallback: false,
      sleepNight: {
        anchorDay: "2026-05-12",
        wakeDay: "2026-05-13",
        provider: "oura",
        source: "ouraVendorSleep",
        sourceDocumentId: "s1",
        isComplete: true,
        score: 77,
        updatedAt: "2026-05-13T12:00:00.000Z",
        lowestHeartRateBpm: 50,
        averageHrvMs: 23,
      },
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.sleepNight.lowestHeartRateBpm).toBe(50);
      expect(parsed.data.sleepNight.averageHrvMs).toBe(23);
    }
  });

  it("rejects isFallback true", () => {
    const parsed = sleepNightViewDtoSchema.safeParse({
      requestedDay: "2026-05-13",
      anchorDay: "2026-05-12",
      wakeDay: "2026-05-13",
      resolution: "wake_day",
      isFallback: true,
      sleepNight: {
        anchorDay: "2026-05-12",
        wakeDay: "2026-05-13",
        provider: "oura",
        source: "ouraVendorSleep",
        sourceDocumentId: "s1",
        isComplete: true,
        updatedAt: "2026-05-13T12:00:00.000Z",
      },
    });
    expect(parsed.success).toBe(false);
  });
});
