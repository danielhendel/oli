import type { SleepNightViewDto } from "@oli/contracts";

/** Test fixture: attributed canonical sleep night with optional Oura score. */
export function sleepNightViewForDay(day: string, score?: number): SleepNightViewDto {
  return {
    requestedDay: day,
    anchorDay: day,
    wakeDay: day,
    resolution: "exact_anchor",
    isFallback: false,
    sleepNight: {
      anchorDay: day,
      wakeDay: day,
      provider: "oura",
      source: "ouraVendorSleep",
      sourceDocumentId: "s1",
      ...(score != null ? { score } : {}),
      isComplete: true,
      totalSleepMinutes: 530,
      updatedAt: "2026-07-05T08:00:00.000Z",
    },
  };
}
