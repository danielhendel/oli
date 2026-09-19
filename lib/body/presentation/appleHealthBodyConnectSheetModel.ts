/**
 * Presentation model + helpers for the Body Composition Apple Health connect sheet.
 * Pure — no I/O. Separates source connection from history-import presentation.
 */

export type AppleHealthBodyConnectSheetPhase =
  | "explaining"
  | "requestingPermission"
  | "findingLatest"
  | "importingRecent"
  | "importingEarlier"
  | "upToDate"
  | "connectedNoData"
  | "historyIncomplete"
  | "waitingForNetwork"
  | "needsReview"
  | "failed"
  | "connectedStatus";

export type BodyMetricConnectionCardKind =
  | "sync_now"
  | "connected"
  | "connected_attention"
  | "syncing"
  | "importing"
  | "review_access"
  | "try_again"
  | "resume";

export type AppleHealthBodyConnectSheetCopy = {
  readonly title: string;
  readonly eyebrow: string | null;
  readonly body: string | null;
  readonly progressLabel: string | null;
  readonly statusChip: string | null;
  readonly primaryLabel: string | null;
  readonly primaryDisabled: boolean;
  readonly secondaryLabel: string | null;
  readonly footer: string | null;
  readonly showMetricList: boolean;
  readonly showStatusRows: boolean;
  /** Healthy / recovery sheets may pull-to-refresh latest only. */
  readonly allowPullToRefresh: boolean;
  /** Review access — only when source state needs attention. */
  readonly showReviewAccess: boolean;
  readonly showResumeImport: boolean;
};

export const BODY_APPLE_HEALTH_CONNECT_METRICS = [
  "Weight",
  "Body Fat",
  "Lean Tissue",
] as const;

const HEALTHY_CONNECTED: AppleHealthBodyConnectSheetCopy = {
  title: "Body Composition",
  eyebrow: "Apple Health",
  body: "Oli keeps these measurements up to date.",
  progressLabel: null,
  statusChip: "Connected",
  primaryLabel: "Done",
  primaryDisabled: false,
  secondaryLabel: null,
  footer: null,
  showMetricList: true,
  showStatusRows: true,
  allowPullToRefresh: true,
  showReviewAccess: false,
  showResumeImport: false,
};

export function buildAppleHealthBodyConnectSheetCopy(
  phase: AppleHealthBodyConnectSheetPhase,
): AppleHealthBodyConnectSheetCopy {
  switch (phase) {
    case "explaining":
      return {
        title: "Body Composition",
        eyebrow: "Apple Health",
        body: "Keep these measurements up to date.",
        progressLabel: null,
        statusChip: null,
        primaryLabel: "Connect & import history",
        primaryDisabled: false,
        secondaryLabel: "Not now",
        footer: "You control access in Apple Health and can change it at any time.",
        showMetricList: true,
        showStatusRows: false,
        allowPullToRefresh: false,
        showReviewAccess: false,
        showResumeImport: false,
      };
    case "requestingPermission":
      return {
        title: "Body Composition",
        eyebrow: "Apple Health",
        body: null,
        progressLabel: "Connecting…",
        statusChip: null,
        primaryLabel: null,
        primaryDisabled: true,
        secondaryLabel: "Not now",
        footer: "You can leave this screen. If the import pauses, Oli will resume automatically.",
        showMetricList: false,
        showStatusRows: false,
        allowPullToRefresh: false,
        showReviewAccess: false,
        showResumeImport: false,
      };
    case "findingLatest":
      return {
        title: "Body Composition",
        eyebrow: "Apple Health",
        body: null,
        progressLabel: "Finding latest measurements…",
        statusChip: null,
        primaryLabel: null,
        primaryDisabled: true,
        secondaryLabel: "Close",
        footer: "You can leave this screen. If the import pauses, Oli will resume automatically.",
        showMetricList: false,
        showStatusRows: false,
        allowPullToRefresh: false,
        showReviewAccess: false,
        showResumeImport: false,
      };
    case "importingRecent":
      return {
        title: "Body Composition",
        eyebrow: "Apple Health",
        body: null,
        progressLabel: "Importing recent history…",
        statusChip: "Importing",
        primaryLabel: null,
        primaryDisabled: true,
        secondaryLabel: "Close",
        footer: "You can leave this screen. If the import pauses, Oli will resume automatically.",
        showMetricList: false,
        showStatusRows: false,
        allowPullToRefresh: false,
        showReviewAccess: false,
        showResumeImport: false,
      };
    case "importingEarlier":
      return {
        title: "Body Composition",
        eyebrow: "Apple Health",
        body: null,
        progressLabel: "Importing earlier history…",
        statusChip: "Importing",
        primaryLabel: null,
        primaryDisabled: true,
        secondaryLabel: "Close",
        footer: "You can leave this screen. If the import pauses, Oli will resume automatically.",
        showMetricList: false,
        showStatusRows: false,
        allowPullToRefresh: false,
        showReviewAccess: false,
        showResumeImport: false,
      };
    case "upToDate":
    case "connectedStatus":
      return { ...HEALTHY_CONNECTED };
    case "connectedNoData":
      return {
        ...HEALTHY_CONNECTED,
        body: "No Body measurements were found yet.",
        showMetricList: false,
      };
    case "historyIncomplete":
      return {
        title: "Body Composition",
        eyebrow: "Apple Health",
        body: "Your latest measurements are available. Oli has not finished importing all earlier Body history.",
        progressLabel: null,
        statusChip: "Connected",
        primaryLabel: "Resume history",
        primaryDisabled: false,
        secondaryLabel: "Done",
        footer: null,
        showMetricList: false,
        showStatusRows: true,
        allowPullToRefresh: true,
        showReviewAccess: false,
        showResumeImport: true,
      };
    case "waitingForNetwork":
      return {
        title: "Body Composition",
        eyebrow: "Apple Health",
        body: "Body history paused. Oli will resume when you’re back online.",
        progressLabel: null,
        statusChip: "Connected",
        primaryLabel: "Resume when online",
        primaryDisabled: false,
        secondaryLabel: "Done",
        footer: null,
        showMetricList: false,
        showStatusRows: true,
        allowPullToRefresh: true,
        showReviewAccess: false,
        showResumeImport: true,
      };
    case "needsReview":
      return {
        title: "Body Composition",
        eyebrow: "Apple Health",
        body: "Oli couldn’t access Body measurements.",
        progressLabel: null,
        statusChip: "Needs attention",
        primaryLabel: "Review access",
        primaryDisabled: false,
        secondaryLabel: "Done",
        footer: null,
        showMetricList: false,
        showStatusRows: false,
        allowPullToRefresh: false,
        showReviewAccess: false,
        showResumeImport: false,
      };
    case "failed":
      return {
        title: "Body Composition",
        eyebrow: "Apple Health",
        body: "We couldn’t finish connecting to Apple Health.",
        progressLabel: null,
        statusChip: null,
        primaryLabel: "Try again",
        primaryDisabled: false,
        secondaryLabel: "Close",
        footer: null,
        showMetricList: false,
        showStatusRows: false,
        allowPullToRefresh: false,
        showReviewAccess: false,
        showResumeImport: false,
      };
    default: {
      const _exhaustive: never = phase;
      throw new Error(`Unhandled Apple Health Body sheet phase: ${String(_exhaustive)}`);
    }
  }
}

/**
 * Factually format last successful latest-refresh timestamp.
 * Does not invent “Just now” without a real timestamp.
 */
export function formatAppleHealthLastUpdatedLabel(
  lastSuccessfulSyncAtIso: string | null,
  nowMs: number = Date.now(),
): string {
  if (!lastSuccessfulSyncAtIso) return "Not yet";
  const t = Date.parse(lastSuccessfulSyncAtIso);
  if (!Number.isFinite(t)) return "Not yet";
  const deltaMs = nowMs - t;
  if (deltaMs >= 0 && deltaMs < 90_000) return "Just now";
  const d = new Date(t);
  const now = new Date(nowMs);
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (sameDay) return `Today, ${time}`;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function resolveBodyHistoryStatusLabel(
  phase: AppleHealthBodyConnectSheetPhase,
  historyAttention: boolean,
): string {
  switch (phase) {
    case "importingRecent":
    case "importingEarlier":
      return "Importing";
    case "waitingForNetwork":
      return "Paused";
    case "historyIncomplete":
      return "Incomplete";
    case "upToDate":
    case "connectedStatus":
    case "connectedNoData":
      return historyAttention ? "Incomplete" : "Up to date";
    case "explaining":
    case "requestingPermission":
    case "findingLatest":
    case "needsReview":
    case "failed":
      return historyAttention ? "Incomplete" : "—";
    default: {
      const _exhaustive: never = phase;
      return String(_exhaustive);
    }
  }
}

/**
 * Card footer action — source Connected must not become Try again when history fails.
 */
export function mapConnectPhaseToCardAction(
  phase: AppleHealthBodyConnectSheetPhase | "idle",
  accessPhase: string,
  historyAttention = false,
): { kind: BodyMetricConnectionCardKind; label: string } {
  if (phase === "requestingPermission" || phase === "findingLatest") {
    return { kind: "syncing", label: "Connecting…" };
  }
  if (phase === "importingRecent" || phase === "importingEarlier") {
    return { kind: "importing", label: "Importing…" };
  }
  if (phase === "needsReview" || accessPhase === "denied") {
    return { kind: "review_access", label: "Review access" };
  }
  if (
    phase === "historyIncomplete" ||
    phase === "waitingForNetwork" ||
    historyAttention
  ) {
    if (
      accessPhase === "ready" ||
      accessPhase === "granted_no_data" ||
      phase === "historyIncomplete" ||
      phase === "waitingForNetwork"
    ) {
      return { kind: "connected_attention", label: "Connected" };
    }
  }
  if (
    phase === "upToDate" ||
    phase === "connectedNoData" ||
    phase === "connectedStatus" ||
    accessPhase === "ready" ||
    accessPhase === "granted_no_data"
  ) {
    return { kind: "connected", label: "Connected" };
  }
  if (phase === "failed") {
    return { kind: "try_again", label: "Try again" };
  }
  if (accessPhase === "syncing") {
    return { kind: "syncing", label: "Syncing…" };
  }
  if (accessPhase === "unavailable") {
    return { kind: "try_again", label: "Try again" };
  }
  return { kind: "sync_now", label: "Sync now" };
}
