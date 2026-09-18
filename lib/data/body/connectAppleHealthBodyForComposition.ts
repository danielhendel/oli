/**
 * Explicit Apple Health Body Composition connect — Body-only permissions,
 * bounded latest sync, then resumable history import. No Steps/Activity/Workout
 * side effects (unlike onboarding connect).
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
  getAppleHealthBodyBackfillState,
  getAppleHealthConnected,
  getAppleHealthNotAvailable,
  setAppleHealthBodyBackfillState,
  setAppleHealthBodyLastCheckedAt,
  setAppleHealthConnected,
  setLastSyncAt,
} from "@/lib/integrations/appleHealth/storage";
import { nowIso } from "@/lib/sync/throttle";

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

export type AppleHealthBodyCompositionConnectPhase =
  | "requestingPermission"
  | "findingLatest"
  | "importingRecent"
  | "importingEarlier"
  | "upToDate"
  | "connectedNoData"
  | "failed";

export type AppleHealthBodyCompositionConnectResult =
  | {
      ok: true;
      phase: "upToDate" | "connectedNoData";
      samplesIngested: number;
      alreadyConnected: boolean;
    }
  | {
      ok: false;
      reason: "unavailable" | "permission_denied" | "no_token" | "not_ios" | "sync_failed" | "import_failed";
      message: string;
    };

export type AppleHealthBodyCompositionConnectDeps = {
  getIdToken: (forceRefresh?: boolean) => Promise<string | null>;
  onPhase?: (phase: AppleHealthBodyCompositionConnectPhase) => void;
  /** Called after latest/recent sync succeeds so UI can refetch cards. */
  onLatestSynced?: () => void;
};

/**
 * One-tap Body Composition connect + import history.
 * Permission → account connect flag → latest/recent sync → resumable backfill.
 */
export async function connectAppleHealthBodyForComposition(
  deps: AppleHealthBodyCompositionConnectDeps,
): Promise<AppleHealthBodyCompositionConnectResult> {
  if (Platform.OS !== "ios") {
    return { ok: false, reason: "not_ios", message: "Apple Health is available on iPhone." };
  }

  const notAvailable = await getAppleHealthNotAvailable().catch(() => false);
  if (notAvailable) {
    return {
      ok: false,
      reason: "unavailable",
      message: "Apple Health isn’t available on this device.",
    };
  }

  const wasConnected = await getAppleHealthConnected().catch(() => false);

  deps.onPhase?.("requestingPermission");
  const perm = await requestBodyCompositionPermissions();
  if (!perm.ok) {
    return {
      ok: false,
      reason: "permission_denied",
      message: "We couldn’t finish connecting to Apple Health. Try again when you’re ready.",
    };
  }

  await setAppleHealthConnected(true).catch(() => undefined);

  const token = await deps.getIdToken(false);
  if (!token) {
    return {
      ok: false,
      reason: "no_token",
      message: "Sign in to connect Apple Health.",
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

  if (!syncResult.ok) {
    return {
      ok: false,
      reason: "sync_failed",
      message: "We couldn’t finish importing your Body history. Try again.",
    };
  }

  await setAppleHealthBodyLastCheckedAt(nowIso()).catch(() => undefined);
  await setLastSyncAt(nowIso()).catch(() => undefined);
  deps.onLatestSynced?.();

  deps.onPhase?.("importingRecent");
  // Backfill runner covers recent + earlier history in bounded chunks (existing 5Y window).
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
    return {
      ok: false,
      reason: "import_failed",
      message: "We couldn’t finish importing your Body history. Try again.",
    };
  }

  const samplesIngested = syncResult.ingested + (backfill.samplesIngested ?? 0);
  const phase = samplesIngested > 0 ? "upToDate" : "connectedNoData";
  deps.onPhase?.(phase);

  return {
    ok: true,
    phase,
    samplesIngested,
    alreadyConnected: wasConnected,
  };
}

export type AppleHealthBodyCompositionSyncLatestResult =
  | { ok: true; ingested: number }
  | { ok: false; message: string };

/** Explicit “Sync latest” from the connected status sheet — Body-only, no history restart. */
export async function syncAppleHealthBodyLatestForComposition(
  deps: Omit<AppleHealthBodyCompositionConnectDeps, "onPhase">,
): Promise<AppleHealthBodyCompositionSyncLatestResult> {
  const connected = await getAppleHealthConnected().catch(() => false);
  if (!connected) {
    return { ok: false, message: "Connect Apple Health before syncing." };
  }
  const token = await deps.getIdToken(false);
  if (!token) {
    return { ok: false, message: "Sign in to sync Body measurements." };
  }
  const perm = await requestBodyCompositionPermissions();
  if (!perm.ok) {
    return { ok: false, message: "We couldn’t sync with Apple Health. Try again." };
  }
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
    return { ok: false, message: "We couldn’t sync with Apple Health. Try again." };
  }
  await setAppleHealthBodyLastCheckedAt(nowIso()).catch(() => undefined);
  deps.onLatestSynced?.();
  return { ok: true, ingested: syncResult.ingested };
}
