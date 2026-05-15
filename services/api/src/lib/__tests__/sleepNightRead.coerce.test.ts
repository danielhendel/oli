import { sleepNightDocumentSchema } from "@oli/contracts/sleepNight";

import { coerceRawSleepNightForRead } from "../sleepNightReadCoerce";

describe("coerceRawSleepNightForRead", () => {
  const base = {
    provider: "oura",
    source: "ouraVendorSleep",
    sourceDocumentId: "s1",
    anchorDay: "2026-05-12",
    totalSleepMinutes: 530,
    mainSleepMinutes: 530,
    endedAt: "2026-05-13T14:30:00.000Z",
  };

  it("derives wakeDay from endedAt when wakeDay is absent", () => {
    const merged = coerceRawSleepNightForRead({ ...base }, "2026-05-12");
    const parsed = sleepNightDocumentSchema.safeParse(merged);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.wakeDay).toBe("2026-05-13");
      expect(parsed.data.isComplete).toBe(true);
    }
  });

  it("upgrades isComplete false to true when duration and endedAt support Dash semantics", () => {
    const merged = coerceRawSleepNightForRead(
      {
        ...base,
        isComplete: false,
      },
      "2026-05-12",
    );
    const parsed = sleepNightDocumentSchema.safeParse(merged);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.isComplete).toBe(true);
    }
  });

  it("infers endedAt from startedAt + duration so exact-anchor doc can become complete", () => {
    const merged = coerceRawSleepNightForRead(
      {
        provider: "oura",
        source: "ouraVendorSleep",
        sourceDocumentId: "s1",
        anchorDay: "2026-05-13",
        startedAt: "2026-05-13T01:00:00.000Z",
        mainSleepMinutes: 551,
        isComplete: false,
      },
      "2026-05-13",
    );
    const parsed = sleepNightDocumentSchema.safeParse(merged);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.isComplete).toBe(true);
      expect(typeof parsed.data.endedAt).toBe("string");
      expect(parsed.data.wakeDay.length).toBe(10);
    }
  });

  it("fills anchorDay from doc id when anchor field is missing", () => {
    const merged = coerceRawSleepNightForRead(
      {
        provider: "oura",
        source: "ouraVendorSleep",
        sourceDocumentId: "s1",
        totalSleepMinutes: 400,
        endedAt: "2026-05-13T08:00:00.000Z",
      },
      "2026-05-12",
    );
    const parsed = sleepNightDocumentSchema.safeParse(merged);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.anchorDay).toBe("2026-05-12");
    }
  });
});
