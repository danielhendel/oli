/**
 * Shared Oura sleep window + rollup day resolution.
 * Used by API ingest, vendor snapshots, SleepNight build, and Cloud Functions post-raw.
 */
/** Minimal Oura v2 sleep document shape for resolution (matches services/api OuraSleepDocument fields used here). */
export type OuraSleepWindowDocument = Record<string, unknown> & {
    id?: string;
    day?: string;
    bed_time?: string;
    wake_time?: string;
    end_time?: string;
    bedtime_start?: string;
    bedtime_end?: string;
    start?: string;
    end?: string;
    total_sleep_duration?: number;
};
/** Wake-time ISO for pull-now diagnostics (same field resolution as ingest). */
export declare function ouraSleepWakeIsoForLog(doc: OuraSleepWindowDocument): string | null;
/**
 * Align with GET /users/me/oura-sleep-view: Oura may return latency as seconds (typically ≥ 60);
 * smaller values are treated as minutes.
 */
export declare function normalizeOuraLatencyRawToMinutes(latencyRaw: number): number;
/**
 * Resolved sleep window + logical rollup day for Oura sleep docs.
 * Shared by raw-event ingest, vendor snapshots, and canonical SleepNight anchor day.
 */
export declare function resolveOuraSleepIngestBase(doc: OuraSleepWindowDocument): {
    start: string;
    end: string;
    rollupDay: string;
} | null;
