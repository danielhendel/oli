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
export const APPLE_HEALTH_DEEP_BACKFILL_VERSION = "appleHealth:deepBackfillVersion";
/** Last completed workout range-bootstrap build id (see workoutBootstrapPolicy). */
export const APPLE_HEALTH_WORKOUT_RANGE_BOOTSTRAP_BUILD = "appleHealth:workoutRangeBootstrapBuild";

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

export async function getAppleHealthConnected(): Promise<boolean> {
  const v = await AsyncStorage.getItem(APPLE_HEALTH_CONNECTED);
  return v === "true";
}

export async function setAppleHealthConnected(connected: boolean): Promise<void> {
  await AsyncStorage.setItem(APPLE_HEALTH_CONNECTED, connected ? "true" : "false");
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
