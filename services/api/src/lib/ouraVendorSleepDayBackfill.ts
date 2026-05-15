/**
 * Plan Oura vendor sleep snapshot `day` alignment against ingest rollup
 * (`resolveOuraSleepIngestBase`). Uses only the paired `rawEvents` sleep row
 * (same document id as vendor snapshot); does not invent bed/wake times.
 */

import type { OuraSleepDocument } from "./ouraApi";
import { resolveOuraSleepIngestBase } from "./ouraApi";

export const OURA_VENDOR_SLEEP_DAY_MIGRATION_VERSION = 1;

export type VendorSleepDayPlan =
  | { status: "aligned"; storedDay: string; rollupDay: string }
  | { status: "change"; storedDay: string; rollupDay: string; vendorDocId: string }
  | { status: "skip"; vendorDocId: string; reason: string; storedDay?: string };

function isYmd(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/**
 * Build a minimal Oura API-shaped sleep doc from an Oura-ingested raw sleep `payload`
 * (see `ouraIngestWrite` sleep shape). Returns null if start/end are missing.
 */
export function buildOuraSleepDocumentFromOuraIngestSleepPayload(
  rawEventId: string,
  payload: Record<string, unknown>,
): OuraSleepDocument | null {
  const start = typeof payload.start === "string" && payload.start.length > 0 ? payload.start : null;
  const end = typeof payload.end === "string" && payload.end.length > 0 ? payload.end : null;
  if (!start || !end) return null;

  const apiDay = typeof payload.day === "string" && isYmd(payload.day) ? payload.day : undefined;
  const totalMinutes = typeof payload.totalMinutes === "number" && Number.isFinite(payload.totalMinutes)
    ? payload.totalMinutes
    : 0;
  const total_sleep_duration = Math.max(0, Math.round(totalMinutes * 60));

  const doc: OuraSleepDocument = {
    id: rawEventId,
    start,
    end,
    total_sleep_duration,
  };
  if (apiDay) {
    doc.day = apiDay;
  }
  return doc;
}

/**
 * Raw Firestore `rawEvents` document data for an Oura sleep row (caller verifies kind/sourceId).
 */
export function planOuraVendorSleepDayFromRaw(
  vendorDocId: string,
  storedDay: string | null | undefined,
  rawPayload: Record<string, unknown> | null | undefined,
): VendorSleepDayPlan {
  if (typeof storedDay !== "string" || !isYmd(storedDay)) {
    if (typeof storedDay === "string") {
      return { status: "skip", vendorDocId, reason: "invalid_or_missing_stored_day", storedDay };
    }
    return { status: "skip", vendorDocId, reason: "invalid_or_missing_stored_day" };
  }

  if (!rawPayload || typeof rawPayload !== "object") {
    return { status: "skip", vendorDocId, reason: "missing_raw_payload", storedDay };
  }

  const doc = buildOuraSleepDocumentFromOuraIngestSleepPayload(vendorDocId, rawPayload);
  if (!doc) {
    return { status: "skip", vendorDocId, reason: "insufficient_raw_payload", storedDay };
  }

  const resolved = resolveOuraSleepIngestBase(doc);
  if (!resolved) {
    return { status: "skip", vendorDocId, reason: "unresolvable_sleep_window", storedDay };
  }

  const { rollupDay } = resolved;
  if (rollupDay === storedDay) {
    return { status: "aligned", storedDay, rollupDay };
  }
  return { status: "change", storedDay, rollupDay, vendorDocId };
}

export type VendorSleepDayMigrationWriteFields = {
  day: string;
  migratedAt: unknown;
  migrationVersion: typeof OURA_VENDOR_SLEEP_DAY_MIGRATION_VERSION;
};

export function buildVendorSleepDayMigrationWritePatch(input: {
  rollupDay: string;
  migratedAt: unknown;
}): VendorSleepDayMigrationWriteFields {
  return {
    day: input.rollupDay,
    migratedAt: input.migratedAt,
    migrationVersion: OURA_VENDOR_SLEEP_DAY_MIGRATION_VERSION,
  };
}

/** Caller should skip vendor doc if raw row is not Oura-ingested sleep (same id). */
export function isOuraIngestedSleepRawEvent(raw: Record<string, unknown> | undefined): boolean {
  if (!raw || typeof raw !== "object") return false;
  return raw.kind === "sleep" && raw.sourceId === "oura" && raw.provider === "manual";
}
