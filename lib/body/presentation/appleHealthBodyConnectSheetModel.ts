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
  readonly showMetricStatusRows: boolean;
  readonly showManageInSettings: boolean;
  readonly showSyncLatest: boolean;
  readonly showReviewAccess: boolean;
  readonly showResumeImport: boolean;
};

export const BODY_APPLE_HEALTH_CONNECT_METRICS = [
  "Weight",
  "Body Fat",
  "Lean Tissue",
] as const;

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
        showMetricStatusRows: false,
        showManageInSettings: false,
        showSyncLatest: false,
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
        showMetricStatusRows: false,
        showManageInSettings: false,
        showSyncLatest: false,
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
        showMetricStatusRows: false,
        showManageInSettings: false,
        showSyncLatest: false,
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
        showMetricStatusRows: false,
        showManageInSettings: false,
        showSyncLatest: false,
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
        showMetricStatusRows: false,
        showManageInSettings: false,
        showSyncLatest: false,
        showReviewAccess: false,
        showResumeImport: false,
      };
    case "upToDate":
      return {
        title: "Body Composition",
        eyebrow: "Apple Health",
        body: "Your available Body history is up to date.",
        progressLabel: null,
        statusChip: "Connected",
        primaryLabel: "Done",
        primaryDisabled: false,
        secondaryLabel: null,
        footer: null,
        showMetricList: false,
        showMetricStatusRows: true,
        showManageInSettings: true,
        showSyncLatest: true,
        showReviewAccess: true,
        showResumeImport: false,
      };
    case "connectedNoData":
      return {
        title: "Body Composition",
        eyebrow: "Apple Health",
        body: "No Body measurements were found yet.",
        progressLabel: null,
        statusChip: "Connected",
        primaryLabel: "Done",
        primaryDisabled: false,
        secondaryLabel: null,
        footer:
          "Connection and data availability are separate. Measurements may appear after you log them in Health or another app.",
        showMetricList: false,
        showMetricStatusRows: true,
        showManageInSettings: true,
        showSyncLatest: true,
        showReviewAccess: true,
        showResumeImport: false,
      };
    case "historyIncomplete":
      return {
        title: "Body Composition",
        eyebrow: "Apple Health",
        body: "We couldn’t finish importing all of your Body history. Your latest measurements are still available.",
        progressLabel: null,
        statusChip: "Connected",
        primaryLabel: "Resume import",
        primaryDisabled: false,
        secondaryLabel: "Close",
        footer: null,
        showMetricList: false,
        showMetricStatusRows: true,
        showManageInSettings: true,
        showSyncLatest: true,
        showReviewAccess: true,
        showResumeImport: true,
      };
    case "connectedStatus":
      return {
        title: "Body Composition",
        eyebrow: "Apple Health",
        body: "Apple Health is connected for Body measurements.",
        progressLabel: null,
        statusChip: "Connected",
        primaryLabel: "Done",
        primaryDisabled: false,
        secondaryLabel: null,
        footer: null,
        showMetricList: true,
        showMetricStatusRows: true,
        showManageInSettings: true,
        showSyncLatest: true,
        showReviewAccess: true,
        showResumeImport: false,
      };
    case "waitingForNetwork":
      return {
        title: "Body Composition",
        eyebrow: "Apple Health",
        body: "Body history paused. Oli will resume when you’re back online.",
        progressLabel: null,
        statusChip: "Connected",
        primaryLabel: "Resume",
        primaryDisabled: false,
        secondaryLabel: "Close",
        footer: null,
        showMetricList: false,
        showMetricStatusRows: false,
        showManageInSettings: false,
        showSyncLatest: false,
        showReviewAccess: false,
        showResumeImport: true,
      };
    case "needsReview":
      return {
        title: "Body Composition",
        eyebrow: "Apple Health",
        body: "Apple Health access may need attention for Body measurements. Enable the body metrics you want to share in Settings or the Health app.",
        progressLabel: null,
        statusChip: null,
        primaryLabel: "Open Settings",
        primaryDisabled: false,
        secondaryLabel: "Close",
        footer: null,
        showMetricList: false,
        showMetricStatusRows: false,
        showManageInSettings: true,
        showSyncLatest: false,
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
        showMetricStatusRows: false,
        showManageInSettings: false,
        showSyncLatest: false,
        showReviewAccess: false,
        showResumeImport: false,
      };
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
  // History incomplete / waiting: keep Connected with attention — never a giant Try again.
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
    // Only when source itself failed to connect — not history failure.
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
