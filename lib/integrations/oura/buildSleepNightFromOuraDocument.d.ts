/**
 * Build Firestore merge payload for `users/{uid}/sleepNights/{anchorDay}` from an Oura sleep API doc.
 */
import { type OuraSleepWindowDocument } from "./resolveOuraSleepIngestBase";
export type SleepNightBuildContext = {
    /** Oura sleep document id (matches `users/{uid}/ouraVendorSleep/{id}` when present). */
    sourceDocumentId: string;
};
/**
 * Coerce Oura sleep score / composite_score (number or digit string) to 0–100 integer.
 */
export declare function coerceOuraSleepScore0to100(raw: unknown): number | null;
/**
 * Build Firestore merge payload for `users/{uid}/sleepNights/{anchorDay}`.
 * Returns null when bed/wake cannot be resolved (same gate as ingest).
 */
export declare function buildSleepNightFromOuraSleepDocument(doc: OuraSleepWindowDocument, ctx: SleepNightBuildContext): {
    anchorDay: string;
    merge: Record<string, unknown>;
} | null;
