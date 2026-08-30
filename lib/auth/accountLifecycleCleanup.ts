/**
 * Central account lifecycle cleanup coordinator (Stage 1C).
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

import { healthAssessmentStore } from "@/lib/data/health-assessment/healthAssessmentStore";
import { nutritionMealDraftStore } from "@/lib/data/nutrition/nutritionMealDraftStore";
import { workoutProgramDesignStore } from "@/lib/data/program/workoutProgramDesignStore";
import { cleanupExportArchiveFiles } from "@/lib/data/user-data/export/cleanupExportArchive";
import {
  ACCOUNT_DELETION_RECOVERY_MARKER_KEY,
  type AccountDeletionRecoveryMarker,
  type LocalCleanupReason,
} from "@/lib/data/user-data/localDataStoreRegistry";
import { clearTimelineAndEventsCaches } from "@/lib/data/timelineCache";
import { __testing_resetDailyFactsSessionCache } from "@/lib/data/dailyFactsSessionCache";
import { getSharedFoodCache } from "@/lib/nutrition/FoodCache";
import { NutritionQueue } from "@/lib/nutrition/NutritionQueue";
import { clearAllWorkoutCalendarMarkerCaches } from "@/lib/data/workouts/workoutsCalendarMarkerCache";
import { clearActiveWorkoutSessionId } from "@/lib/workouts/sessionEngine/activeSessionStorage";
import { clearWorkoutsAnchor } from "@/lib/integrations/appleHealth/anchor";

const WORKOUT_OVERRIDE_KEY = "workouts:overrides:v1";
const REST_TIMER_KEY = "workouts:restTimer:lastDurationSec:v1";

async function removeKeysMatchingPrefix(prefix: string): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const toRemove = keys.filter((k) => k.startsWith(prefix));
  if (toRemove.length > 0) {
    await AsyncStorage.multiRemove(toRemove);
  }
}

async function clearPerUidKeys(uid: string): Promise<void> {
  const prefixes = [
    `nutrition:recentLogging:v1:${uid}`,
    `workouts:journal:v1:u:${uid}`,
    `workouts:journalIndex:v1:u:${uid}`,
    `workouts:customExercises:v1:u:${uid}`,
    `workouts:activeSessionId:v1:${uid}`,
    `workouts:activeLogFlowMode:v1:${uid}`,
    `workouts:activeEnrichTargetId:v1:${uid}`,
    `workouts:enrichSession:v1:${uid}:`,
    `appleHealth:anchor:v1:workouts:${uid}`,
    `appleHealth:workoutsRecentRepair:lastRunAt:${uid}`,
  ];

  for (const prefix of prefixes) {
    await removeKeysMatchingPrefix(prefix);
  }

  await clearActiveWorkoutSessionId(uid).catch(() => undefined);
  await clearWorkoutsAnchor(uid).catch(() => undefined);
}

async function clearDeviceGlobalIntegrationKeys(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const toRemove = keys.filter(
    (k) =>
      k.startsWith("appleHealth:") ||
      k.startsWith("oura:") ||
      k.startsWith("oli.refreshBus.v1:"),
  );
  if (toRemove.length > 0) {
    await AsyncStorage.multiRemove(toRemove);
  }
}

async function clearGlobalHealthStores(): Promise<void> {
  await NutritionQueue.clear().catch(() => undefined);
  await AsyncStorage.multiRemove([WORKOUT_OVERRIDE_KEY, REST_TIMER_KEY]).catch(() => undefined);
  await clearAllWorkoutCalendarMarkerCaches().catch(() => undefined);
  await clearDeviceGlobalIntegrationKeys().catch(() => undefined);
  getSharedFoodCache().clear();
  nutritionMealDraftStore.reset();
  healthAssessmentStore.reset();
  workoutProgramDesignStore.reset();
  clearTimelineAndEventsCaches();
  __testing_resetDailyFactsSessionCache();
  await cleanupExportArchiveFiles();
}

export async function clearUserScopedLocalData(args: {
  previousUserId: string | null;
  reason: LocalCleanupReason;
}): Promise<void> {
  const { previousUserId, reason } = args;

  if (previousUserId) {
    await clearPerUidKeys(previousUserId);
  }

  if (reason === "sign_out" || reason === "account_switch" || reason === "account_deletion") {
    await clearGlobalHealthStores();
  }

  if (reason === "account_deletion" || reason === "sign_out") {
    await AsyncStorage.removeItem(ACCOUNT_DELETION_RECOVERY_MARKER_KEY).catch(() => undefined);
  }
}

export async function setAccountDeletionRecoveryMarker(
  marker: AccountDeletionRecoveryMarker,
): Promise<void> {
  await AsyncStorage.setItem(ACCOUNT_DELETION_RECOVERY_MARKER_KEY, JSON.stringify(marker));
}

export async function readAccountDeletionRecoveryMarker(): Promise<AccountDeletionRecoveryMarker | null> {
  const raw = await AsyncStorage.getItem(ACCOUNT_DELETION_RECOVERY_MARKER_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AccountDeletionRecoveryMarker;
    if (parsed?.phase === "cleanup_required" || parsed?.phase === "pending_signout") {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export async function clearAccountDeletionRecoveryMarker(): Promise<void> {
  await AsyncStorage.removeItem(ACCOUNT_DELETION_RECOVERY_MARKER_KEY);
}

export async function resumeAccountDeletionLocalCleanup(
  previousUserId: string | null,
): Promise<void> {
  await clearUserScopedLocalData({
    previousUserId,
    reason: "account_deletion",
  });
  await clearAccountDeletionRecoveryMarker();
}
