/**
 * Explicit Apple Health Body Composition connect — Body-only permissions,
 * bounded latest sync, then resumable history import.
 *
 * Source connection and history import are independent outcomes:
 * latest sync success keeps the source Connected even if history later fails.
 *
 * Trigger context (internal): body_connect — must not enqueue Activity/Steps work.
 */

import { Platform } from "react-native";

import { ingestRawEvent } from "@/lib/api/ingest";
import {
  appleHealthBodyCompositionIdempotencyKey,
  appleHealthBodyWeightIdempotencyKey,
  pullBodyCompositionSamples,
  requestBodyCompositionPermissions,
  runAppleHealthBodyBackfill,
  runAppleHealthBodySync,
} from "@/lib/integrations/appleHealth";
import {
  enableAppleHealthDomain,
  getAppleHealthBodyBackfillState,
  getAppleHealthConnected,
  getAppleHealthNotAvailable,
  setAppleHealthBodyBackfillState,
  setAppleHealthBodyLastCheckedAt,
  setLastSyncAt,
} from "@/lib/integrations/appleHealth/storage";
import { nowIso } from "@/lib/sync/throttle";

/** Internal trigger — never shown in consumer UI. */
export const APPLE_HEALTH_BODY_CONNECT_TRIGGER = "body_connect" as const;

const LATEST_DAYS_BACK = 45;

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function getDeviceTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return typeof tz === "string" && tz.length ? tz : "UTC";
  } catch {
    return "UTC";
  }
}

export type AppleHealthBodySourceState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "needsReview";

export type AppleHealthBodyHistoryState =
  | "notStarted"
  | "findingLatest"
  | "importingRecent"
  | "importingEarlier"
  | "paused"
  | "partial"
  | "complete"
  | "failed";

export type AppleHealthBodyCompositionConnectPhase =
  | "requestingPermission"
  | "findingLatest"
  | "importingRecent"
  | "importingEarlier"
  | "upToDate"
  | "connectedNoData"
  | "historyIncomplete"
  | "failed";

export type AppleHealthBodyCompositionConnectResult =
  | {
      ok: true;
      sourceState: "connected";
      historyState: "complete" | "partial" | "failed";
      phase: "upToDate" | "connectedNoData" | "historyIncomplete";
      samplesIngested: number;
      alreadyConnected: boolean;
      safeErrorCode?: "history_batch_failed";
    }
  | {
      ok: false;
      sourceState: AppleHealthBodySourceState;
      historyState: AppleHealthBodyHistoryState;
      reason: "unavailable" | "permission_denied" | "no_token" | "not_ios" | "sync_failed";
      message: string;
      safeErrorCode: string;
    };

export type AppleHealthBodyCompositionConnectDeps = {
  getIdToken: (forceRefresh?: boolean) => Promise<string | null>;
  onPhase?: (phase: AppleHealthBodyCompositionConnectPhase) => void;
  /** Called after latest/recent sync succeeds so UI can refetch cards. */
  onLatestSynced?: () => void;
};

function logBodyOp(op: string, fields: Record<string, string | number | boolean | undefined>): void {
  if (typeof __DEV__ !== "undefined" && __DEV__) {
    // Safe structured observability — no health values, UUIDs, tokens, or UIDs.
    // eslint-disable-next-line no-console
    console.info(`[AH_BODY] ${op}`, fields);
  }
}

/**
 * One-tap Body Composition connect + import history.
 * Permission → body domain enable → latest sync → resumable backfill.
 */
export async function connectAppleHealthBodyForComposition(
  deps: AppleHealthBodyCompositionConnectDeps,
): Promise<AppleHealthBodyCompositionConnectResult> {
  logBodyOp("apple_health_body_connect_started", { trigger: APPLE_HEALTH_BODY_CONNECT_TRIGGER });

  if (Platform.OS !== "ios") {
    return {
      ok: false,
      sourceState: "disconnected",
      historyState: "notStarted",
      reason: "not_ios",
      message: "Apple Health is available on iPhone.",
      safeErrorCode: "not_ios",
    };
  }

  const notAvailable = await getAppleHealthNotAvailable().catch(() => false);
  if (notAvailable) {
    return {
      ok: false,
      sourceState: "disconnected",
      historyState: "notStarted",
      reason: "unavailable",
      message: "Apple Health isn’t available on this device.",
      safeErrorCode: "unavailable",
    };
  }

  const wasConnected = await getAppleHealthConnected().catch(() => false);

  deps.onPhase?.("requestingPermission");
  const perm = await requestBodyCompositionPermissions();
  logBodyOp("apple_health_body_authorization_completed", {
    ok: perm.ok,
    trigger: APPLE_HEALTH_BODY_CONNECT_TRIGGER,
  });
  if (!perm.ok) {
    return {
      ok: false,
      sourceState: "needsReview",
      historyState: "notStarted",
      reason: "permission_denied",
      message: "We couldn’t finish connecting to Apple Health. Try again when you’re ready.",
      safeErrorCode: "permission_denied",
    };
  }

  // Account source + Body domain only — does not enable Activity (Steps).
  await enableAppleHealthDomain("body").catch(() => undefined);

  const token = await deps.getIdToken(false);
  if (!token) {
    return {
      ok: false,
      sourceState: "disconnected",
      historyState: "notStarted",
      reason: "no_token",
      message: "Sign in to connect Apple Health.",
      safeErrorCode: "no_token",
    };
  }

  deps.onPhase?.("findingLatest");
  const syncResult = await runAppleHealthBodySync(
    {
      token,
      startDate: isoDaysAgo(LATEST_DAYS_BACK),
      endDate: new Date().toISOString(),
      limit: 200,
    },
    {
      pullBodyCompositionSamples,
      ingestRawEvent,
      appleHealthBodyWeightIdempotencyKey,
      appleHealthBodyCompositionIdempotencyKey,
      getDeviceTimezone,
    },
  );

  logBodyOp("apple_health_body_latest_query_completed", {
    ok: syncResult.ok,
    ingestedBucket: syncResult.ok ? (syncResult.ingested > 0 ? "nonzero" : "zero") : "n/a",
  });

  if (!syncResult.ok) {
    return {
      ok: false,
      sourceState: "connected",
      historyState: "failed",
      reason: "sync_failed",
      message: "We couldn’t load your latest Body measurements. Try again.",
      safeErrorCode: "latest_sync_failed",
    };
  }

  await setAppleHealthBodyLastCheckedAt(nowIso()).catch(() => undefined);
  await setLastSyncAt(nowIso()).catch(() => undefined);
  deps.onLatestSynced?.();

  deps.onPhase?.("importingRecent");
  deps.onPhase?.("importingEarlier");
  const backfill = await runAppleHealthBodyBackfill(
    { token },
    {
      nowIso,
      pullBodyCompositionSamples,
      ingestRawEvent,
      appleHealthBodyWeightIdempotencyKey,
      appleHealthBodyCompositionIdempotencyKey,
      getDeviceTimezone,
      getBackfillState: getAppleHealthBodyBackfillState,
      setBackfillState: setAppleHealthBodyBackfillState,
    },
  );

  if (!backfill.ok) {
    logBodyOp("apple_health_body_history_failed", {
      safeErrorCode: "history_batch_failed",
      hasRequestId: backfill.requestId != null,
    });
    // Source stays connected; latest values already available.
    deps.onPhase?.("historyIncomplete");
    return {
      ok: true,
      sourceState: "connected",
      historyState: "failed",
      phase: "historyIncomplete",
      samplesIngested: syncResult.ingested,
      alreadyConnected: wasConnected,
      safeErrorCode: "history_batch_failed",
    };
  }

  logBodyOp("apple_health_body_history_completed", {
    status: backfill.status,
    samplesBucket: backfill.samplesIngested > 0 ? "nonzero" : "zero",
  });

  const samplesIngested = syncResult.ingested + (backfill.samplesIngested ?? 0);
  const phase = samplesIngested > 0 ? "upToDate" : "connectedNoData";
  deps.onPhase?.(phase);

  return {
    ok: true,
    sourceState: "connected",
    historyState: "complete",
    phase,
    samplesIngested,
    alreadyConnected: wasConnected,
  };
}

/** Resume Body history from checkpoint after partial/failed import. */
export async function resumeAppleHealthBodyHistoryImport(
  deps: AppleHealthBodyCompositionConnectDeps,
): Promise<AppleHealthBodyCompositionConnectResult> {
  const connected = await getAppleHealthConnected().catch(() => false);
  if (!connected) {
    return {
      ok: false,
      sourceState: "disconnected",
      historyState: "notStarted",
      reason: "unavailable",
      message: "Connect Apple Health before importing history.",
      safeErrorCode: "not_connected",
    };
  }
  const token = await deps.getIdToken(false);
  if (!token) {
    return {
      ok: false,
      sourceState: "connected",
      historyState: "paused",
      reason: "no_token",
      message: "Sign in to resume Body history import.",
      safeErrorCode: "no_token",
    };
  }

  deps.onPhase?.("importingEarlier");
  const backfill = await runAppleHealthBodyBackfill(
    { token },
    {
      nowIso,
      pullBodyCompositionSamples,
      ingestRawEvent,
      appleHealthBodyWeightIdempotencyKey,
      appleHealthBodyCompositionIdempotencyKey,
      getDeviceTimezone,
      getBackfillState: getAppleHealthBodyBackfillState,
      setBackfillState: setAppleHealthBodyBackfillState,
    },
  );

  if (!backfill.ok) {
    logBodyOp("apple_health_body_history_failed", { safeErrorCode: "history_batch_failed", resume: true });
    deps.onPhase?.("historyIncomplete");
    return {
      ok: true,
      sourceState: "connected",
      historyState: "failed",
      phase: "historyIncomplete",
      samplesIngested: 0,
      alreadyConnected: true,
      safeErrorCode: "history_batch_failed",
    };
  }

  deps.onLatestSynced?.();
  deps.onPhase?.("upToDate");
  return {
    ok: true,
    sourceState: "connected",
    historyState: "complete",
    phase: "upToDate",
    samplesIngested: backfill.samplesIngested,
    alreadyConnected: true,
  };
}

export type AppleHealthBodyCompositionSyncLatestResult =
  | { ok: true; ingested: number }
  | { ok: false; message: string };

export type AppleHealthBodyLatestRefreshTrigger =
  | "body_status_sheet_open"
  | "pull_to_refresh"
  | "body_page_entry"
  | "body_page_pull_refresh";

/** Latest-only Body refresh — no history restart, no unrelated domains, no auth re-prompt. */
export async function syncAppleHealthBodyLatestForComposition(
  deps: Omit<AppleHealthBodyCompositionConnectDeps, "onPhase">,
  opts?: { trigger?: AppleHealthBodyLatestRefreshTrigger },
): Promise<AppleHealthBodyCompositionSyncLatestResult> {
  const trigger = opts?.trigger ?? "pull_to_refresh";
  if (typeof __DEV__ !== "undefined" && __DEV__) {
    // eslint-disable-next-line no-console
    console.info("[AH_BODY] apple_health_body_latest_refresh_started", { trigger });
  }
  const connected = await getAppleHealthConnected().catch(() => false);
  if (!connected) {
    return { ok: false, message: "Connect Apple Health before syncing." };
  }
  const token = await deps.getIdToken(false);
  if (!token) {
    return { ok: false, message: "Sign in to sync Body measurements." };
  }
  // Already connected — do not re-request HealthKit authorization on refresh.
  const syncResult = await runAppleHealthBodySync(
    {
      token,
      startDate: isoDaysAgo(LATEST_DAYS_BACK),
      endDate: new Date().toISOString(),
      limit: 200,
    },
    {
      pullBodyCompositionSamples,
      ingestRawEvent,
      appleHealthBodyWeightIdempotencyKey,
      appleHealthBodyCompositionIdempotencyKey,
      getDeviceTimezone,
    },
  );
  if (!syncResult.ok) {
    if (typeof __DEV__ !== "undefined" && __DEV__) {
      // eslint-disable-next-line no-console
      console.info("[AH_BODY] apple_health_body_latest_refresh_failed", {
        trigger,
        safeErrorCode: "latest_refresh_failed",
      });
    }
    return {
      ok: false,
      message: "Couldn’t refresh. Check your connection and pull down to try again.",
    };
  }
  await setAppleHealthBodyLastCheckedAt(nowIso()).catch(() => undefined);
  deps.onLatestSynced?.();
  if (typeof __DEV__ !== "undefined" && __DEV__) {
    // eslint-disable-next-line no-console
    console.info("[AH_BODY] apple_health_body_latest_refresh_completed", {
      trigger,
      ingestedBucket: syncResult.ingested > 0 ? "nonzero" : "zero",
    });
  }
  return { ok: true, ingested: syncResult.ingested };
}
