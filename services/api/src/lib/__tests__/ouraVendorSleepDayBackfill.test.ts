/**
 * Oura vendor sleep day backfill — planning + write patch (no Firestore).
 */
import {
  buildOuraSleepDocumentFromOuraIngestSleepPayload,
  buildVendorSleepDayMigrationWritePatch,
  isOuraIngestedSleepRawEvent,
  OURA_VENDOR_SLEEP_DAY_MIGRATION_VERSION,
  planOuraVendorSleepDayFromRaw,
} from "../ouraVendorSleepDayBackfill";

describe("buildOuraSleepDocumentFromOuraIngestSleepPayload", () => {
  it("returns null when start or end is missing", () => {
    expect(buildOuraSleepDocumentFromOuraIngestSleepPayload("id1", {})).toBeNull();
    expect(
      buildOuraSleepDocumentFromOuraIngestSleepPayload("id1", { start: "2025-03-14T22:00:00.000Z" }),
    ).toBeNull();
  });

  it("maps start/end/totalMinutes and optional api day", () => {
    const doc = buildOuraSleepDocumentFromOuraIngestSleepPayload("sleep_abc", {
      start: "2025-03-14T22:00:00.000Z",
      end: "2025-03-15T06:00:00.000Z",
      totalMinutes: 480,
      day: "2025-03-15",
    });
    expect(doc).toMatchObject({
      id: "sleep_abc",
      start: "2025-03-14T22:00:00.000Z",
      end: "2025-03-15T06:00:00.000Z",
      day: "2025-03-15",
      total_sleep_duration: 480 * 60,
    });
  });
});

describe("planOuraVendorSleepDayFromRaw", () => {
  it("returns aligned when stored day matches rollup", () => {
    const plan = planOuraVendorSleepDayFromRaw("s1", "2025-03-15", {
      start: "2025-03-14T22:00:00.000Z",
      end: "2025-03-15T06:00:00.000Z",
      totalMinutes: 480,
    });
    expect(plan).toEqual({ status: "aligned", storedDay: "2025-03-15", rollupDay: "2025-03-15" });
  });

  it("returns change when stored day was legacy bed-UTC key (dry-run scenario)", () => {
    const plan = planOuraVendorSleepDayFromRaw("s1", "2025-03-14", {
      start: "2025-03-14T22:00:00.000Z",
      end: "2025-03-15T06:00:00.000Z",
      totalMinutes: 480,
    });
    expect(plan).toEqual({
      status: "change",
      storedDay: "2025-03-14",
      rollupDay: "2025-03-15",
      vendorDocId: "s1",
    });
  });

  it("prefers Oura api day on raw payload over wake-only rollup (doc.day override)", () => {
    const plan = planOuraVendorSleepDayFromRaw("s_api", "2026-04-19", {
      start: "2026-04-18T22:00:00.000Z",
      end: "2026-04-19T11:00:00.000Z",
      day: "2026-04-19",
      totalMinutes: 486,
    });
    expect(plan).toEqual({ status: "aligned", storedDay: "2026-04-19", rollupDay: "2026-04-19" });
  });

  it("uses api day for change detection when stored day disagrees with payload.day", () => {
    const plan = planOuraVendorSleepDayFromRaw("s_api2", "2026-04-18", {
      start: "2026-04-18T22:00:00.000Z",
      end: "2026-04-19T11:00:00.000Z",
      day: "2026-04-19",
      totalMinutes: 486,
    });
    expect(plan).toEqual({
      status: "change",
      storedDay: "2026-04-18",
      rollupDay: "2026-04-19",
      vendorDocId: "s_api2",
    });
  });

  it("wake-day fallback when payload has no day", () => {
    const plan = planOuraVendorSleepDayFromRaw("s_wake", "2025-03-11", {
      start: "2025-03-10T21:30:00.000Z",
      end: "2025-03-11T05:45:00.000Z",
      totalMinutes: 495,
    });
    expect(plan).toEqual({ status: "aligned", storedDay: "2025-03-11", rollupDay: "2025-03-11" });
  });

  it("skips when raw payload is missing", () => {
    const plan = planOuraVendorSleepDayFromRaw("s1", "2025-03-15", undefined);
    expect(plan).toEqual({
      status: "skip",
      vendorDocId: "s1",
      reason: "missing_raw_payload",
      storedDay: "2025-03-15",
    });
  });

  it("skips when stored day is invalid", () => {
    const plan = planOuraVendorSleepDayFromRaw("s1", "not-a-day", {
      start: "2025-03-14T22:00:00.000Z",
      end: "2025-03-15T06:00:00.000Z",
    });
    expect(plan).toEqual({
      status: "skip",
      vendorDocId: "s1",
      reason: "invalid_or_missing_stored_day",
      storedDay: "not-a-day",
    });
  });
});

describe("isOuraIngestedSleepRawEvent", () => {
  it("returns true only for Oura-ingested sleep raw rows", () => {
    expect(
      isOuraIngestedSleepRawEvent({
        kind: "sleep",
        sourceId: "oura",
        provider: "manual",
        payload: {},
      }),
    ).toBe(true);
    expect(isOuraIngestedSleepRawEvent({ kind: "hrv", sourceId: "oura", provider: "manual" })).toBe(false);
    expect(isOuraIngestedSleepRawEvent({ kind: "sleep", sourceId: "oura", provider: "apple_health" })).toBe(false);
    expect(isOuraIngestedSleepRawEvent(undefined)).toBe(false);
  });
});

describe("buildVendorSleepDayMigrationWritePatch (write mode fields)", () => {
  it("includes day, migratedAt sentinel, and migrationVersion", () => {
    const migratedAt = { __test: "serverTimestamp" };
    const patch = buildVendorSleepDayMigrationWritePatch({ rollupDay: "2025-03-15", migratedAt });
    expect(patch).toEqual({
      day: "2025-03-15",
      migratedAt,
      migrationVersion: OURA_VENDOR_SLEEP_DAY_MIGRATION_VERSION,
    });
  });
});
