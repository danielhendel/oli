/**
 * Presentation model + helpers for the Body Composition Apple Health connect sheet.
 * Pure — no I/O. Screens/hooks map runtime phase into this model.
 */

export type AppleHealthBodyConnectSheetPhase =
  | "explaining"
  | "requestingPermission"
  | "findingLatest"
  | "importingRecent"
  | "importingEarlier"
  | "upToDate"
  | "connectedNoData"
  | "waitingForNetwork"
  | "needsReview"
  | "failed"
  | "connectedStatus";

export type BodyMetricConnectionCardKind =
  | "sync_now"
  | "connected"
  | "syncing"
  | "importing"
  | "review_access"
  | "try_again"
  | "resume";

export type AppleHealthBodyConnectSheetCopy = {
  readonly title: string;
  readonly body: string | null;
  readonly progressLabel: string | null;
  readonly primaryLabel: string | null;
  readonly primaryDisabled: boolean;
  readonly secondaryLabel: string | null;
  readonly footer: string | null;
  readonly showMetricList: boolean;
  readonly showManageInSettings: boolean;
  readonly showSyncLatest: boolean;
  readonly showReviewAccess: boolean;
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
        title: "Connect Apple Health",
        body: "Keep your Body Composition up to date.",
        progressLabel: null,
        primaryLabel: "Connect & import history",
        primaryDisabled: false,
        secondaryLabel: "Not now",
        footer:
          "Oli will import your available history for these measurements and keep new measurements up to date. You control access in Apple Health and can change it at any time.",
        showMetricList: true,
        showManageInSettings: false,
        showSyncLatest: false,
        showReviewAccess: false,
      };
    case "requestingPermission":
      return {
        title: "Connect Apple Health",
        body: null,
        progressLabel: "Connecting to Apple Health…",
        primaryLabel: null,
        primaryDisabled: true,
        secondaryLabel: "Not now",
        footer: "You can leave this screen. If the import pauses, Oli will resume automatically.",
        showMetricList: false,
        showManageInSettings: false,
        showSyncLatest: false,
        showReviewAccess: false,
      };
    case "findingLatest":
      return {
        title: "Connect Apple Health",
        body: null,
        progressLabel: "Finding your latest measurements…",
        primaryLabel: null,
        primaryDisabled: true,
        secondaryLabel: "Close",
        footer: "You can leave this screen. If the import pauses, Oli will resume automatically.",
        showMetricList: false,
        showManageInSettings: false,
        showSyncLatest: false,
        showReviewAccess: false,
      };
    case "importingRecent":
      return {
        title: "Importing Body history",
        body: null,
        progressLabel: "Importing recent Body history…",
        primaryLabel: null,
        primaryDisabled: true,
        secondaryLabel: "Close",
        footer: "You can leave this screen. If the import pauses, Oli will resume automatically.",
        showMetricList: false,
        showManageInSettings: false,
        showSyncLatest: false,
        showReviewAccess: false,
      };
    case "importingEarlier":
      return {
        title: "Importing Body history",
        body: null,
        progressLabel: "Importing earlier Body history…",
        primaryLabel: null,
        primaryDisabled: true,
        secondaryLabel: "Close",
        footer: "You can leave this screen. If the import pauses, Oli will resume automatically.",
        showMetricList: false,
        showManageInSettings: false,
        showSyncLatest: false,
        showReviewAccess: false,
      };
    case "upToDate":
      return {
        title: "Apple Health connected",
        body: "Your available Body history is up to date.",
        progressLabel: null,
        primaryLabel: "Done",
        primaryDisabled: false,
        secondaryLabel: null,
        footer: null,
        showMetricList: false,
        showManageInSettings: true,
        showSyncLatest: true,
        showReviewAccess: true,
      };
    case "connectedNoData":
      return {
        title: "Apple Health connected",
        body: "No Body measurements were found yet.",
        progressLabel: null,
        primaryLabel: "Done",
        primaryDisabled: false,
        secondaryLabel: null,
        footer: "Connection and data availability are separate. Measurements may appear after you log them in Health or another app.",
        showMetricList: false,
        showManageInSettings: true,
        showSyncLatest: true,
        showReviewAccess: true,
      };
    case "connectedStatus":
      return {
        title: "Apple Health",
        body: "Apple Health is connected for Body measurements.",
        progressLabel: null,
        primaryLabel: "Done",
        primaryDisabled: false,
        secondaryLabel: null,
        footer: null,
        showMetricList: true,
        showManageInSettings: true,
        showSyncLatest: true,
        showReviewAccess: true,
      };
    case "waitingForNetwork":
      return {
        title: "Import paused",
        body: "Oli will resume when you’re back online.",
        progressLabel: null,
        primaryLabel: "Resume",
        primaryDisabled: false,
        secondaryLabel: "Close",
        footer: null,
        showMetricList: false,
        showManageInSettings: false,
        showSyncLatest: false,
        showReviewAccess: false,
      };
    case "needsReview":
      return {
        title: "Review Apple Health access",
        body: "Apple Health access may need attention for Body measurements. Enable the body metrics you want to share in Settings or the Health app.",
        progressLabel: null,
        primaryLabel: "Open Settings",
        primaryDisabled: false,
        secondaryLabel: "Close",
        footer: null,
        showMetricList: false,
        showManageInSettings: true,
        showSyncLatest: false,
        showReviewAccess: false,
      };
    case "failed":
      return {
        title: "Couldn’t finish importing",
        body: "We couldn’t finish importing your Body history.",
        progressLabel: null,
        primaryLabel: "Try again",
        primaryDisabled: false,
        secondaryLabel: "Close",
        footer: null,
        showMetricList: false,
        showManageInSettings: false,
        showSyncLatest: false,
        showReviewAccess: false,
      };
  }
}

export function mapConnectPhaseToCardAction(
  phase: AppleHealthBodyConnectSheetPhase | "idle",
  accessPhase: string,
): { kind: BodyMetricConnectionCardKind; label: string } {
  if (phase === "requestingPermission" || phase === "findingLatest") {
    return { kind: "syncing", label: "Connecting…" };
  }
  if (phase === "importingRecent" || phase === "importingEarlier") {
    return { kind: "importing", label: "Importing…" };
  }
  if (phase === "waitingForNetwork") {
    return { kind: "resume", label: "Resume" };
  }
  if (phase === "failed") {
    return { kind: "try_again", label: "Try again" };
  }
  if (phase === "needsReview" || accessPhase === "denied") {
    return { kind: "review_access", label: "Review access" };
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
  if (accessPhase === "syncing") {
    return { kind: "syncing", label: "Syncing…" };
  }
  if (accessPhase === "unavailable") {
    return { kind: "try_again", label: "Try again" };
  }
  return { kind: "sync_now", label: "Sync now" };
}
