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

  it("repairs UTC-skewed wakeDay when anchorDay is the user-local wake morning", () => {
    const merged = coerceRawSleepNightForRead(
      {
        provider: "oura",
        source: "ouraVendorSleep",
        sourceDocumentId: "asia1",
        anchorDay: "2026-07-10",
        wakeDay: "2026-07-09",
        startedAt: "2026-07-09T15:00:00.000Z",
        endedAt: "2026-07-09T21:30:00.000Z",
        mainSleepMinutes: 390,
        totalSleepMinutes: 390,
        isComplete: true,
      },
      "2026-07-10",
    );
    const parsed = sleepNightDocumentSchema.safeParse(merged);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.wakeDay).toBe("2026-07-10");
      expect(parsed.data.anchorDay).toBe("2026-07-10");
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

  it("does not move wake earlier when anchorDay is before valid UTC end", () => {
    const input = {
      ...base,
      anchorDay: "2026-05-12",
      wakeDay: "2026-05-13",
      endedAt: "2026-05-13T14:30:00.000Z",
    };
    const merged = coerceRawSleepNightForRead({ ...input }, "2026-05-12");
    expect(merged.wakeDay).toBe("2026-05-13");
    expect(merged.anchorDay).toBe("2026-05-12");
  });

  it("ignores invalid anchorDay for skew repair and falls back to docId for anchor", () => {
    const merged = coerceRawSleepNightForRead(
      {
        ...base,
        anchorDay: "not-a-day",
        wakeDay: "2026-05-13",
      },
      "2026-05-12",
    );
    expect(merged.anchorDay).toBe("2026-05-12");
    expect(merged.wakeDay).toBe("2026-05-13");
  });

  it("does not invent wakeDay from invalid endedAt alone", () => {
    const merged = coerceRawSleepNightForRead(
      {
        provider: "oura",
        source: "ouraVendorSleep",
        sourceDocumentId: "s1",
        anchorDay: "2026-05-12",
        mainSleepMinutes: 400,
        endedAt: "not-an-iso",
      },
      "2026-05-12",
    );
    expect(merged.endedAt).toBe("not-an-iso");
    expect(merged.wakeDay).toBeUndefined();
  });

  it("leaves already-correct records unchanged (idempotent)", () => {
    const input = {
      provider: "oura",
      source: "ouraVendorSleep",
      sourceDocumentId: "s1",
      anchorDay: "2026-07-10",
      wakeDay: "2026-07-10",
      startedAt: "2026-07-09T15:00:00.000Z",
      endedAt: "2026-07-09T21:30:00.000Z",
      mainSleepMinutes: 390,
      totalSleepMinutes: 390,
      isComplete: true,
      score: 84,
    };
    const once = coerceRawSleepNightForRead({ ...input }, "2026-07-10");
    const twice = coerceRawSleepNightForRead({ ...once }, "2026-07-10");
    expect(once).toEqual(twice);
    expect(once.wakeDay).toBe("2026-07-10");
    expect(once.score).toBe(84);
    expect(once.sourceDocumentId).toBe("s1");
  });

  it("does not mutate the caller object", () => {
    const input = {
      ...base,
      wakeDay: "2026-07-09",
      anchorDay: "2026-07-10",
      endedAt: "2026-07-09T21:30:00.000Z",
    };
    const snapshot = JSON.stringify(input);
    coerceRawSleepNightForRead(input, "2026-07-10");
    expect(JSON.stringify(input)).toBe(snapshot);
  });

  it("preserves provenance fields on skew repair", () => {
    const merged = coerceRawSleepNightForRead(
      {
        provider: "oura",
        source: "ouraVendorSleep",
        sourceDocumentId: "asia1",
        anchorDay: "2026-07-10",
        wakeDay: "2026-07-09",
        endedAt: "2026-07-09T21:30:00.000Z",
        mainSleepMinutes: 390,
        totalSleepMinutes: 390,
        isComplete: true,
      },
      "2026-07-10",
    );
    expect(merged.provider).toBe("oura");
    expect(merged.source).toBe("ouraVendorSleep");
    expect(merged.sourceDocumentId).toBe("asia1");
  });

  it("does not treat nap-type field as a reason to invent wakeDay", () => {
    const merged = coerceRawSleepNightForRead(
      {
        provider: "oura",
        source: "ouraVendorSleep",
        sourceDocumentId: "nap1",
        anchorDay: "2026-07-10",
        type: "nap",
        mainSleepMinutes: 40,
        endedAt: "not-valid",
      },
      "2026-07-10",
    );
    expect(merged.wakeDay).toBeUndefined();
    expect(merged.type).toBe("nap");
  });
});
