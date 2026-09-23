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
  requestAppleHealthReadPermissions,
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
  setAppleHealthMetricLastCheckedAt,
  setLastSyncAt,
} from "@/lib/integrations/appleHealth/storage";
import {
  enableAllMetricsForDomain,
  resolveBodyMetricSyncFlags,
  setAppleHealthMetricSyncEnabled,
} from "@/lib/integrations/appleHealth/appleHealthMetricSyncController";
import {
  bodyMetricIncludeFlags,
  getBodyAppleHealthMetricDefinition,
  type BodyAppleHealthMetricId,
} from "@/lib/body/presentation/bodyAppleHealthMetricRegistry";
import { nowIso } from "@/lib/sync/throttle";
import { diagnoseAppleHealthWeightHistoryExtent } from "@/lib/integrations/appleHealth/diagnoseAppleHealthWeightHistoryExtent";

async function bodySyncIncludeForUid(uid: string | undefined) {
  if (!uid) return undefined;
  return resolveBodyMetricSyncFlags(uid);
}

function scopedBodyPull(
  uid: string | undefined,
  includeOverride?: { weight: boolean; bodyFat: boolean; leanTissue: boolean },
) {
  return async (opts: { startDate: string; endDate: string; limit?: number }) => {
    const include = includeOverride ?? (await bodySyncIncludeForUid(uid));
    if (
      include &&
      include.weight !== true &&
      include.bodyFat !== true &&
      include.leanTissue !== true
    ) {
      return { ok: true as const, data: [] };
    }
    return pullBodyCompositionSamples({
      ...opts,
      ...(include ? { include } : {}),
    });
  };
}

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
  /** Current account uid — seeds per-metric Body sync scopes on connect. */
  uid?: string;
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
  if (deps.uid) {
    await enableAllMetricsForDomain(deps.uid, "body").catch(() => undefined);
  }

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
  const include = await bodySyncIncludeForUid(deps.uid);
  const syncResult = await runAppleHealthBodySync(
    {
      token,
      startDate: isoDaysAgo(LATEST_DAYS_BACK),
      endDate: new Date().toISOString(),
      limit: 200,
      ...(include ? { include } : {}),
    },
    {
      pullBodyCompositionSamples: scopedBodyPull(deps.uid),
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
      pullBodyCompositionSamples: scopedBodyPull(deps.uid),
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

  if (typeof __DEV__ !== "undefined" && __DEV__) {
    void diagnoseAppleHealthWeightHistoryExtent();
  }

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
  // DEV physical proof: emit HealthKit Weight extent before resume/re-scan.
  if (typeof __DEV__ !== "undefined" && __DEV__) {
    await diagnoseAppleHealthWeightHistoryExtent();
  }
  const existing = await getAppleHealthBodyBackfillState().catch(() => null);
  // Explicit resume after a prior "completed" marker must re-scan (false-complete repair).
  const forceRestart = existing?.status === "completed";
  const backfill = await runAppleHealthBodyBackfill(
    { token, ...(forceRestart ? { forceRestart: true as const } : {}) },
    {
      nowIso,
      pullBodyCompositionSamples: scopedBodyPull(deps.uid),
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

  if (typeof __DEV__ !== "undefined" && __DEV__) {
    await diagnoseAppleHealthWeightHistoryExtent();
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
  opts?: {
    trigger?: AppleHealthBodyLatestRefreshTrigger;
    /** When set, only this metric is queried/ingested. */
    metricId?: BodyAppleHealthMetricId;
  },
): Promise<AppleHealthBodyCompositionSyncLatestResult> {
  const trigger = opts?.trigger ?? "pull_to_refresh";
  if (typeof __DEV__ !== "undefined" && __DEV__) {
    // eslint-disable-next-line no-console
    console.info("[AH_BODY] apple_health_body_latest_refresh_started", {
      trigger,
      metric: opts?.metricId ?? "all_enabled",
    });
  }
  const connected = await getAppleHealthConnected().catch(() => false);
  if (!connected) {
    return { ok: false, message: "Connect Apple Health before syncing." };
  }
  const token = await deps.getIdToken(false);
  if (!token) {
    return { ok: false, message: "Sign in to sync Body measurements." };
  }

  const include = opts?.metricId
    ? bodyMetricIncludeFlags(opts.metricId)
    : await bodySyncIncludeForUid(deps.uid);

  if (
    include &&
    include.weight !== true &&
    include.bodyFat !== true &&
    include.leanTissue !== true
  ) {
    return { ok: true, ingested: 0 };
  }

  const syncResult = await runAppleHealthBodySync(
    {
      token,
      startDate: isoDaysAgo(LATEST_DAYS_BACK),
      endDate: new Date().toISOString(),
      limit: 200,
      ...(include ? { include } : {}),
    },
    {
      pullBodyCompositionSamples: scopedBodyPull(deps.uid, include ?? undefined),
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
  const checkedAt = nowIso();
  await setAppleHealthBodyLastCheckedAt(checkedAt).catch(() => undefined);
  if (deps.uid && opts?.metricId) {
    await setAppleHealthMetricLastCheckedAt(deps.uid, opts.metricId, checkedAt).catch(
      () => undefined,
    );
  } else if (deps.uid && include) {
    const writes: Promise<void>[] = [];
    if (include.weight) {
      writes.push(setAppleHealthMetricLastCheckedAt(deps.uid, "weight", checkedAt));
    }
    if (include.bodyFat) {
      writes.push(setAppleHealthMetricLastCheckedAt(deps.uid, "bodyFat", checkedAt));
    }
    if (include.leanTissue) {
      writes.push(setAppleHealthMetricLastCheckedAt(deps.uid, "leanTissue", checkedAt));
    }
    await Promise.all(writes.map((p) => p.catch(() => undefined)));
  }
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

/**
 * Metric-scoped Body connect — requests only one HealthKit read type.
 */
export async function connectAppleHealthBodyMetricForComposition(
  deps: AppleHealthBodyCompositionConnectDeps & { metricId: BodyAppleHealthMetricId },
): Promise<AppleHealthBodyCompositionConnectResult> {
  const def = getBodyAppleHealthMetricDefinition(deps.metricId);
  logBodyOp("apple_health_body_metric_connect_started", {
    trigger: "body_metric_connect",
    metric: deps.metricId,
  });

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
  const perm = await requestAppleHealthReadPermissions([def.appleHealthReadType]);
  logBodyOp("apple_health_body_authorization_completed", {
    ok: perm.ok,
    trigger: "body_metric_connect",
    metric: deps.metricId,
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

  await enableAppleHealthDomain("body").catch(() => undefined);
  if (deps.uid) {
    await setAppleHealthMetricSyncEnabled({
      uid: deps.uid,
      metricId: def.scopeKey,
      enabled: true,
    }).catch(() => undefined);
  }

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
  const include = bodyMetricIncludeFlags(deps.metricId);
  const syncResult = await runAppleHealthBodySync(
    {
      token,
      startDate: isoDaysAgo(LATEST_DAYS_BACK),
      endDate: new Date().toISOString(),
      limit: 200,
      include,
    },
    {
      pullBodyCompositionSamples: scopedBodyPull(deps.uid, include),
      ingestRawEvent,
      appleHealthBodyWeightIdempotencyKey,
      appleHealthBodyCompositionIdempotencyKey,
      getDeviceTimezone,
    },
  );

  if (!syncResult.ok) {
    return {
      ok: false,
      sourceState: "connected",
      historyState: "failed",
      reason: "sync_failed",
      message: "We couldn’t load your latest measurements. Try again.",
      safeErrorCode: "latest_sync_failed",
    };
  }

  const checkedAt = nowIso();
  await setAppleHealthBodyLastCheckedAt(checkedAt).catch(() => undefined);
  if (deps.uid) {
    await setAppleHealthMetricLastCheckedAt(deps.uid, deps.metricId, checkedAt).catch(
      () => undefined,
    );
  }
  await setLastSyncAt(checkedAt).catch(() => undefined);
  deps.onLatestSynced?.();

  deps.onPhase?.("importingEarlier");
  const backfill = await runAppleHealthBodyBackfill(
    { token },
    {
      nowIso,
      pullBodyCompositionSamples: scopedBodyPull(deps.uid, include),
      ingestRawEvent,
      appleHealthBodyWeightIdempotencyKey,
      appleHealthBodyCompositionIdempotencyKey,
      getDeviceTimezone,
      getBackfillState: getAppleHealthBodyBackfillState,
      setBackfillState: setAppleHealthBodyBackfillState,
    },
  );

  if (!backfill.ok) {
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

  deps.onLatestSynced?.();
  const phase =
    syncResult.ingested > 0 || backfill.samplesIngested > 0 ? "upToDate" : "connectedNoData";
  deps.onPhase?.(phase === "connectedNoData" ? "upToDate" : phase);
  return {
    ok: true,
    sourceState: "connected",
    historyState: "complete",
    phase: phase === "connectedNoData" ? "connectedNoData" : "upToDate",
    samplesIngested: syncResult.ingested + backfill.samplesIngested,
    alreadyConnected: wasConnected,
  };
}
