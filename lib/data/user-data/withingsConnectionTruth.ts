/**
 * Honest Withings connection status (Phase 3B).
 * Live sync is not supported; never surface a plain “Connected” label.
 * Pure — no React, no Firebase I/O.
 */

export const WITHINGS_LIVE_SYNC_SUPPORTED = false;

export type WithingsDisplayStatus =
  | "connection_unavailable"
  | "previously_connected"
  | "needs_reconnection";

export type WithingsConnectionTruthInput = {
  /** Firestore integrations/withings.connected when present. */
  firestoreConnectedFlag?: boolean | null;
  /** Whether historical Withings rawEvents exist for this user. */
  hasHistoricalRawEvents?: boolean | null;
  /** Must be false until a restored integration ships. */
  liveSyncSupported?: boolean;
};

export type WithingsConnectionTruth = {
  displayStatus: WithingsDisplayStatus;
  label: string;
  summary: string;
  includeInCurrentState: false;
  preserveHistorical: true;
  liveSyncSupported: false;
  orphaned: boolean;
};

const LABELS: Record<WithingsDisplayStatus, string> = {
  connection_unavailable: "Connection unavailable",
  previously_connected: "Previously connected",
  needs_reconnection: "Needs reconnection",
};

export function resolveWithingsConnectionTruth(
  input: WithingsConnectionTruthInput = {},
): WithingsConnectionTruth {
  const liveSyncSupported = input.liveSyncSupported ?? WITHINGS_LIVE_SYNC_SUPPORTED;
  if (liveSyncSupported) {
    // Defensive: Phase 3B does not restore sync. If a caller claims support, still refuse Connected.
    return {
      displayStatus: "needs_reconnection",
      label: LABELS.needs_reconnection,
      summary: "Withings sync is not available in this release.",
      includeInCurrentState: false,
      preserveHistorical: true,
      liveSyncSupported: false,
      orphaned: true,
    };
  }

  const flag = input.firestoreConnectedFlag === true;
  const historical = input.hasHistoricalRawEvents === true;

  let displayStatus: WithingsDisplayStatus;
  if (flag) {
    displayStatus = "previously_connected";
  } else if (historical) {
    displayStatus = "previously_connected";
  } else {
    displayStatus = "connection_unavailable";
  }

  return {
    displayStatus,
    label: LABELS[displayStatus],
    summary:
      displayStatus === "connection_unavailable"
        ? "Withings is not currently syncing. Historical data is preserved when present."
        : "Withings was connected before, but live sync is no longer available. Historical data is preserved and excluded from current body state.",
    includeInCurrentState: false,
    preserveHistorical: true,
    liveSyncSupported: false,
    orphaned: flag || historical,
  };
}

export function withingsDisplayLabelIsHonest(label: string): boolean {
  const normalized = label.trim().toLowerCase();
  if (normalized === "connected") return false;
  return (
    normalized === LABELS.connection_unavailable.toLowerCase() ||
    normalized === LABELS.previously_connected.toLowerCase() ||
    normalized === LABELS.needs_reconnection.toLowerCase()
  );
}
