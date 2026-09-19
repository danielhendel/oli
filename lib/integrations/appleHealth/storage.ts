/**
 * Apple Health W1 — AsyncStorage keys and helpers.
 * Isolates key names for last sync timestamp and connection state.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

export const APPLE_HEALTH_LAST_SYNC_AT = "appleHealth:lastSyncAt";
export const APPLE_HEALTH_LAST_CHECKED_AT = "appleHealth:lastCheckedAt";
export const APPLE_HEALTH_BODY_LAST_CHECKED_AT = "appleHealth:bodyLastCheckedAt";
export const APPLE_HEALTH_BODY_BACKFILL_STATE = "appleHealth:bodyBackfillState";
export const APPLE_HEALTH_STEPS_BACKFILL_STATE = "appleHealth:stepsBackfillState";
/** ISO timestamp of last automatic steps repair completion (cooldown for sync/gap triggers). */
export const APPLE_HEALTH_STEPS_AUTO_REPAIR_LAST_AT = "appleHealth:stepsAutoRepair:lastCompletedAt";
export const APPLE_HEALTH_CONNECTED = "appleHealth:connected";
export const APPLE_HEALTH_NOT_AVAILABLE = "appleHealth:notAvailable";
/** Progressive domain scopes — which domains the current account explicitly enabled. */
export const APPLE_HEALTH_DOMAIN_SCOPES = "appleHealth:domainScopes";
export const APPLE_HEALTH_DEEP_BACKFILL_VERSION = "appleHealth:deepBackfillVersion";
/** Last completed workout range-bootstrap build id (see workoutBootstrapPolicy). */
export const APPLE_HEALTH_WORKOUT_RANGE_BOOTSTRAP_BUILD = "appleHealth:workoutRangeBootstrapBuild";
/** JSON map of local day key → last successfully POSTed steps (client guard vs transient HealthKit regression). */
export const APPLE_HEALTH_LAST_INGESTED_STEPS_BY_DAY = "appleHealth:lastIngestedStepsByDayJson";
/** Last local calendar `yesterday` YMD for which forced Activity open-ingest succeeded (throttle anchor). */
export const APPLE_HEALTH_FORCED_YESTERDAY_LAST_YMD = "appleHealth:forcedYesterday:lastYesterdayYmd";
/** ISO time of last successful forced yesterday ingest (anti-spam within same `yesterday` target). */
export const APPLE_HEALTH_FORCED_YESTERDAY_LAST_AT = "appleHealth:forcedYesterday:lastAtIso";
/**
 * Workouts recent repair throttle anchor — ISO of last *successful* run, per uid.
 *
 * Distinct from `appleHealth:lastCheckedAt` (anchored sync throttle) and
 * `appleHealth:stepsAutoRepair:lastCompletedAt` (steps repair cooldown). Each user's
 * marker lives at `appleHealth:workoutsRecentRepair:lastRunAt:{uid}` so multi-account
 * devices throttle independently. Failed runs MUST NOT update this marker.
 */
export const APPLE_HEALTH_WORKOUTS_RECENT_REPAIR_LAST_RUN_AT_PREFIX =
  "appleHealth:workoutsRecentRepair:lastRunAt";

export async function getLastSyncAt(): Promise<string | null> {
  return AsyncStorage.getItem(APPLE_HEALTH_LAST_SYNC_AT);
}

export async function setLastSyncAt(iso: string): Promise<void> {
  await AsyncStorage.setItem(APPLE_HEALTH_LAST_SYNC_AT, iso);
}

export async function getAppleHealthLastCheckedAt(): Promise<string | null> {
  return AsyncStorage.getItem(APPLE_HEALTH_LAST_CHECKED_AT);
}

export async function setAppleHealthLastCheckedAt(iso: string): Promise<void> {
  await AsyncStorage.setItem(APPLE_HEALTH_LAST_CHECKED_AT, iso);
}

export async function getAppleHealthBodyLastCheckedAt(): Promise<string | null> {
  return AsyncStorage.getItem(APPLE_HEALTH_BODY_LAST_CHECKED_AT);
}

export async function setAppleHealthBodyLastCheckedAt(iso: string): Promise<void> {
  await AsyncStorage.setItem(APPLE_HEALTH_BODY_LAST_CHECKED_AT, iso);
}

export type AppleHealthBodyBackfillStatus = "not_started" | "in_progress" | "completed" | "failed";

export type AppleHealthBodyBackfillState = {
  status: AppleHealthBodyBackfillStatus;
  backfillStartDate: string;
  targetStartDate: string;
  lastProcessedDate: string | null;
  lastRunAt: string;
  summary: {
    startedAt: string;
    completedAt: string | null;
    chunkCount: number;
    samplesRead: number;
    samplesIngested: number;
    samplesSkippedDuplicate: number;
    lastProcessedDate: string | null;
  };
  error: string | null;
};

export async function getAppleHealthBodyBackfillState(): Promise<AppleHealthBodyBackfillState | null> {
  const raw = await AsyncStorage.getItem(APPLE_HEALTH_BODY_BACKFILL_STATE);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AppleHealthBodyBackfillState;
  } catch {
    return null;
  }
}

export async function setAppleHealthBodyBackfillState(state: AppleHealthBodyBackfillState): Promise<void> {
  await AsyncStorage.setItem(APPLE_HEALTH_BODY_BACKFILL_STATE, JSON.stringify(state));
}

export type AppleHealthStepsBackfillStatus = "not_started" | "in_progress" | "completed" | "failed";

/** Who initiated the steps backfill/repair run (persisted for diagnostics and UI). */
export type AppleHealthStepsRepairTriggerSource = "connection" | "sync" | "manual" | "recovery";

export type AppleHealthStepsBackfillState = {
  status: AppleHealthStepsBackfillStatus;
  backfillStartDate: string;
  windowStartDay: string;
  windowEndDay: string;
  lookbackDays: number;
  lastProcessedDay: string | null;
  lastRunAt: string;
  error: string | null;
  /** Present for runs started after this field was added. */
  lastTriggerSource?: AppleHealthStepsRepairTriggerSource | null;
  summary: {
    startedAt: string;
    completedAt: string | null;
    daysTotal: number;
    daysProcessed: number;
    daysIngested: number;
    /** Days where HealthKit returned an empty aggregate (`hkEmpty`); still ingested as steps:0. */
    daysSkippedNoData: number;
    /** Ingest failures mid-run (aborted backfill). Omitted/0 when full success. */
    daysFailed?: number;
    /** Last calendar day that received a successful POST /ingest in this run. */
    lastSuccessfulDay?: string | null;
    lastProcessedDay: string | null;
  };
};

export async function getAppleHealthStepsBackfillState(): Promise<AppleHealthStepsBackfillState | null> {
  const raw = await AsyncStorage.getItem(APPLE_HEALTH_STEPS_BACKFILL_STATE);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AppleHealthStepsBackfillState;
  } catch {
    return null;
  }
}

export async function setAppleHealthStepsBackfillState(state: AppleHealthStepsBackfillState): Promise<void> {
  await AsyncStorage.setItem(APPLE_HEALTH_STEPS_BACKFILL_STATE, JSON.stringify(state));
}

export async function getAppleHealthStepsAutoRepairLastCompletedAt(): Promise<string | null> {
  return AsyncStorage.getItem(APPLE_HEALTH_STEPS_AUTO_REPAIR_LAST_AT);
}

export async function setAppleHealthStepsAutoRepairLastCompletedAt(iso: string): Promise<void> {
  await AsyncStorage.setItem(APPLE_HEALTH_STEPS_AUTO_REPAIR_LAST_AT, iso);
}

/**
 * Local account-connection flag for Apple Health.
 * Device HealthKit permission ≠ connected. Set only via explicit Connect
 * (onboarding or devices). Cleared on sign_out / account_switch / account_deletion
 * via `apple_health_global` registry policy (`appleHealth:` prefix).
 * Not uid-scoped today — account switch clears the global key.
 */
export async function getAppleHealthConnected(): Promise<boolean> {
  const v = await AsyncStorage.getItem(APPLE_HEALTH_CONNECTED);
  return v === "true";
}

export async function setAppleHealthConnected(connected: boolean): Promise<void> {
  await AsyncStorage.setItem(APPLE_HEALTH_CONNECTED, connected ? "true" : "false");
}

/**
 * Progressive domain enablement for the current Apple Health source.
 * Legacy devices with `connected=true` and no scopes key are treated as all
 * implemented domains enabled (preserves prior behavior).
 * Body-only connect writes an explicit scopes object with only `body: true`.
 */
export type AppleHealthDomainScopesV1 = {
  readonly version: 1;
  readonly body?: boolean;
  readonly activity?: boolean;
  readonly workouts?: boolean;
  readonly cardioVitals?: boolean;
  readonly sleepRecovery?: boolean;
  readonly nutrition?: boolean;
};

export type AppleHealthDomainScopeId = keyof Omit<AppleHealthDomainScopesV1, "version">;

export async function getAppleHealthDomainScopes(): Promise<AppleHealthDomainScopesV1 | null> {
  const raw = await AsyncStorage.getItem(APPLE_HEALTH_DOMAIN_SCOPES);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AppleHealthDomainScopesV1;
    if (parsed && parsed.version === 1) return parsed;
    return null;
  } catch {
    return null;
  }
}

export async function setAppleHealthDomainScopes(scopes: AppleHealthDomainScopesV1): Promise<void> {
  await AsyncStorage.setItem(APPLE_HEALTH_DOMAIN_SCOPES, JSON.stringify(scopes));
}

/**
 * Enable one domain without enabling unrelated domains.
 * Also sets the account-level connected flag.
 */
export async function enableAppleHealthDomain(domain: AppleHealthDomainScopeId): Promise<void> {
  const existing = (await getAppleHealthDomainScopes()) ?? { version: 1 as const };
  await setAppleHealthDomainScopes({ ...existing, version: 1, [domain]: true });
  await setAppleHealthConnected(true);
}

/** Enable all currently implemented domains (Settings → Connect all / onboarding). */
export async function enableAllImplementedAppleHealthDomains(): Promise<void> {
  await setAppleHealthDomainScopes({
    version: 1,
    body: true,
    activity: true,
    workouts: true,
    cardioVitals: true,
  });
  await setAppleHealthConnected(true);
}

/**
 * Whether a domain may run import/repair work.
 * Legacy: connected without scopes → allow (pre-progressive migration).
 * Explicit scopes: only listed domains.
 */
export async function isAppleHealthDomainEnabled(domain: AppleHealthDomainScopeId): Promise<boolean> {
  const connected = await getAppleHealthConnected().catch(() => false);
  if (!connected) return false;
  const scopes = await getAppleHealthDomainScopes().catch(() => null);
  if (!scopes) {
    // Legacy global connect — preserve prior Behavior until account re-connects.
    return true;
  }
  return scopes[domain] === true;
}

export async function getAppleHealthNotAvailable(): Promise<boolean> {
  const v = await AsyncStorage.getItem(APPLE_HEALTH_NOT_AVAILABLE);
  return v === "true";
}

export async function setAppleHealthNotAvailable(notAvailable: boolean): Promise<void> {
  await AsyncStorage.setItem(APPLE_HEALTH_NOT_AVAILABLE, notAvailable ? "true" : "false");
}

export async function getAppleHealthDeepBackfillVersion(): Promise<string | null> {
  return AsyncStorage.getItem(APPLE_HEALTH_DEEP_BACKFILL_VERSION);
}

export async function setAppleHealthDeepBackfillVersion(version: string): Promise<void> {
  await AsyncStorage.setItem(APPLE_HEALTH_DEEP_BACKFILL_VERSION, version);
}

export async function getAppleHealthWorkoutRangeBootstrapBuild(): Promise<string | null> {
  return AsyncStorage.getItem(APPLE_HEALTH_WORKOUT_RANGE_BOOTSTRAP_BUILD);
}

export async function setAppleHealthWorkoutRangeBootstrapBuild(buildId: string): Promise<void> {
  await AsyncStorage.setItem(APPLE_HEALTH_WORKOUT_RANGE_BOOTSTRAP_BUILD, buildId);
}

export async function clearAppleHealthWorkoutRangeBootstrapBuild(): Promise<void> {
  await AsyncStorage.removeItem(APPLE_HEALTH_WORKOUT_RANGE_BOOTSTRAP_BUILD);
}

async function readLastIngestedStepsMap(): Promise<Record<string, number>> {
  const raw = await AsyncStorage.getItem(APPLE_HEALTH_LAST_INGESTED_STEPS_BY_DAY);
  if (!raw) return {};
  try {
    const p = JSON.parse(raw) as unknown;
    if (typeof p !== "object" || p === null || Array.isArray(p)) return {};
    return p as Record<string, number>;
  } catch {
    return {};
  }
}

/** Highest steps value we successfully ingested for this local calendar day (per-device). */
export async function getLastIngestedStepsForDay(dayYmd: string): Promise<number | null> {
  const m = await readLastIngestedStepsMap();
  const v = m[dayYmd];
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null;
}

export async function setLastIngestedStepsForDay(dayYmd: string, steps: number): Promise<void> {
  const m = await readLastIngestedStepsMap();
  m[dayYmd] = steps;
  const keys = Object.keys(m).sort();
  if (keys.length > 500) {
    for (const k of keys.slice(0, keys.length - 500)) {
      delete m[k];
    }
  }
  await AsyncStorage.setItem(APPLE_HEALTH_LAST_INGESTED_STEPS_BY_DAY, JSON.stringify(m));
}

export async function getAppleHealthForcedYesterdayRefreshLastYmd(): Promise<string | null> {
  return AsyncStorage.getItem(APPLE_HEALTH_FORCED_YESTERDAY_LAST_YMD);
}

export async function setAppleHealthForcedYesterdayRefreshLastYmd(ymd: string): Promise<void> {
  await AsyncStorage.setItem(APPLE_HEALTH_FORCED_YESTERDAY_LAST_YMD, ymd);
}

export async function getAppleHealthForcedYesterdayRefreshLastAtIso(): Promise<string | null> {
  return AsyncStorage.getItem(APPLE_HEALTH_FORCED_YESTERDAY_LAST_AT);
}

export async function setAppleHealthForcedYesterdayRefreshLastAtIso(iso: string): Promise<void> {
  await AsyncStorage.setItem(APPLE_HEALTH_FORCED_YESTERDAY_LAST_AT, iso);
}

/**
 * Per-uid key for the workouts recent repair throttle. Asserting a non-empty uid here
 * mirrors `lib/integrations/appleHealth/anchor.ts` and prevents accidental writes to
 * a shared "global" slot when a sign-in race surfaces an empty string.
 */
export function appleHealthWorkoutsRecentRepairLastRunAtKey(uid: string): string {
  if (!uid || typeof uid !== "string") {
    throw new Error("appleHealth workouts recent repair: uid required");
  }
  return `${APPLE_HEALTH_WORKOUTS_RECENT_REPAIR_LAST_RUN_AT_PREFIX}:${uid}`;
}

export async function getAppleHealthWorkoutsRecentRepairLastRunAt(
  uid: string,
): Promise<string | null> {
  return AsyncStorage.getItem(appleHealthWorkoutsRecentRepairLastRunAtKey(uid));
}

export async function setAppleHealthWorkoutsRecentRepairLastRunAt(
  uid: string,
  iso: string,
): Promise<void> {
  await AsyncStorage.setItem(appleHealthWorkoutsRecentRepairLastRunAtKey(uid), iso);
}
