import type { SleepNightDocumentDto } from "@oli/contracts";
import { buildDailySleepCardModel } from "../buildDailySleepCardModel";

const day = "2026-05-10";

function minimalNight(over: Partial<SleepNightDocumentDto> = {}): SleepNightDocumentDto {
  return {
    anchorDay: day,
    wakeDay: day,
    provider: "oura",
    source: "ouraVendorSleep",
    sourceDocumentId: "s1",
    isComplete: true,
    updatedAt: "2026-05-10T12:00:00.000Z",
    totalSleepMinutes: 480,
    ...over,
  };
}

/**
 * Simulates Dash: SleepNight request settles — model picks up headline when `sleepNightSettled` is true.
 */
describe("buildDailySleepCardModel Dash sleep sequencing", () => {
  it("renders headline after SleepNight arrives", () => {
    const before = buildDailySleepCardModel({
      day,
      sleepNight: undefined,
      sleepNightSettled: false,
    });
    expect(before.headlineValueText).toBeNull();

    const after = buildDailySleepCardModel({
      day,
      sleepNight: minimalNight({ score: 96 }),
      sleepNightSettled: true,
    });
    expect(after.scoreValueText).toBe("96");
    expect(after.ratingLabel).toBe("Optimal");
    expect(after.headlineValueText).toBe("8h");
  });
});
