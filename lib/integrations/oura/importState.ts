/**
 * Pure helper: map Oura integration/presence fields to a user-facing import state.
 * Used by device detail and recovery screens to show truthful Oura data availability.
 */

import type { OuraBackfillStatus } from "@/lib/data/useOuraPresence";

export type OuraImportState =
  | "disconnected"
  | "running"
  | "failed"
  | "ready"
  | "connected_no_data";

export type OuraImportStateInput = {
  connected: boolean;
  lastSnapshotAt?: string | null | undefined;
  backfillStatus?: OuraBackfillStatus | null | undefined;
};

/**
 * Derives a single user-facing import state from Oura presence/integration fields.
 * - disconnected: not connected
 * - running: connected, backfill in progress
 * - failed: connected, backfill failed
 * - ready: connected, at least one snapshot (sleep/readiness data available)
 * - connected_no_data: connected, no snapshot yet, backfill idle/completed or never run
 */
export function deriveOuraImportState(input: OuraImportStateInput): OuraImportState {
  if (!input.connected) return "disconnected";
  if (input.lastSnapshotAt != null && input.lastSnapshotAt !== "") return "ready";
  if (input.backfillStatus === "running") return "running";
  if (input.backfillStatus === "failed") return "failed";
  return "connected_no_data";
}
