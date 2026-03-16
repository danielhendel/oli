/**
 * Oura sync metadata semantics: when to set lastRefreshAt, lastSyncAt, lastSnapshotAt.
 * Legacy recovery: detect connected users with no snapshot/backfill state and trigger backfill.
 */

export type OuraSyncMetadataFields = {
  setLastRefreshAt: true;
  setLastSyncAt: boolean;
  setLastSnapshotAt: boolean;
};

/**
 * Derive which metadata fields to set after a refresh run.
 * - lastRefreshAt: always set (we completed a refresh attempt that reached metadata write).
 * - lastSyncAt / lastSnapshotAt: only when at least one vendor snapshot doc was written.
 */
export function deriveOuraSyncMetadataFields(
  snapshotWrittenCount: number,
): OuraSyncMetadataFields {
  return {
    setLastRefreshAt: true,
    setLastSyncAt: snapshotWrittenCount > 0,
    setLastSnapshotAt: snapshotWrittenCount > 0,
  };
}

/** Integration doc fields needed for legacy detection (from Firestore read). */
export type OuraIntegrationLegacyInput = {
  connected?: boolean;
  lastSnapshotAt?: unknown;
  backfillStatus?: string | null;
};

/**
 * True when the user is connected but has never been migrated into the snapshot/backfill-aware model:
 * - connected === true
 * - lastSnapshotAt is null/absent
 * - backfillStatus is null/absent or "idle"
 */
export function isLegacyOuraIntegration(data: OuraIntegrationLegacyInput | null | undefined): boolean {
  if (!data || !data.connected) return false;
  if (data.lastSnapshotAt != null) return false;
  const status = data.backfillStatus;
  if (status === "running" || status === "completed" || status === "failed") return false;
  return true;
}
