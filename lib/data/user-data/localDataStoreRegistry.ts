/**
 * Local persistent store registry for account lifecycle cleanup (Stage 1C).
 */

export type LocalCleanupReason = "sign_out" | "account_switch" | "account_deletion";

export type LocalStorePolicy = {
  storeId: string;
  /** AsyncStorage key or key prefix pattern. */
  keyPattern: string;
  userScoped: boolean;
  containsHealthData: boolean;
  containsCredentials: boolean;
  signOut: "clear" | "preserve" | "clear_per_uid";
  accountSwitch: "clear" | "preserve" | "clear_per_uid";
  accountDeletion: "clear" | "preserve" | "clear_per_uid";
};

export const LOCAL_DATA_STORE_REGISTRY: readonly LocalStorePolicy[] = [
  {
    storeId: "nutrition_queue",
    keyPattern: "oli_nutrition_ingest_queue_v1",
    userScoped: false,
    containsHealthData: true,
    containsCredentials: false,
    signOut: "clear",
    accountSwitch: "clear",
    accountDeletion: "clear",
  },
  {
    storeId: "workout_overrides",
    keyPattern: "workouts:overrides:v1",
    userScoped: false,
    containsHealthData: true,
    containsCredentials: false,
    signOut: "clear",
    accountSwitch: "clear",
    accountDeletion: "clear",
  },
  {
    storeId: "workout_calendar_markers",
    keyPattern: "workouts:calendarMarkers:v1:",
    userScoped: false,
    containsHealthData: true,
    containsCredentials: false,
    signOut: "clear",
    accountSwitch: "clear",
    accountDeletion: "clear",
  },
  {
    storeId: "nutrition_recent_logging",
    keyPattern: "nutrition:recentLogging:v1:",
    userScoped: true,
    containsHealthData: true,
    containsCredentials: false,
    signOut: "clear_per_uid",
    accountSwitch: "clear_per_uid",
    accountDeletion: "clear_per_uid",
  },
  {
    storeId: "workout_journal",
    keyPattern: "workouts:journal:v1:u:",
    userScoped: true,
    containsHealthData: true,
    containsCredentials: false,
    signOut: "clear_per_uid",
    accountSwitch: "clear_per_uid",
    accountDeletion: "clear_per_uid",
  },
  {
    storeId: "workout_journal_index",
    keyPattern: "workouts:journalIndex:v1:u:",
    userScoped: true,
    containsHealthData: true,
    containsCredentials: false,
    signOut: "clear_per_uid",
    accountSwitch: "clear_per_uid",
    accountDeletion: "clear_per_uid",
  },
  {
    storeId: "workout_active_session",
    keyPattern: "workouts:activeSessionId:v1:",
    userScoped: true,
    containsHealthData: true,
    containsCredentials: false,
    signOut: "clear_per_uid",
    accountSwitch: "clear_per_uid",
    accountDeletion: "clear_per_uid",
  },
  {
    storeId: "workout_custom_exercises",
    keyPattern: "workouts:customExercises:v1:u:",
    userScoped: true,
    containsHealthData: false,
    containsCredentials: false,
    signOut: "clear_per_uid",
    accountSwitch: "clear_per_uid",
    accountDeletion: "clear_per_uid",
  },
  {
    storeId: "apple_health_anchor",
    keyPattern: "appleHealth:anchor:v1:workouts:",
    userScoped: true,
    containsHealthData: true,
    containsCredentials: false,
    signOut: "clear_per_uid",
    accountSwitch: "clear_per_uid",
    accountDeletion: "clear_per_uid",
  },
  {
    storeId: "apple_health_global",
    keyPattern: "appleHealth:",
    userScoped: false,
    containsHealthData: true,
    containsCredentials: false,
    signOut: "clear",
    accountSwitch: "clear",
    accountDeletion: "clear",
  },
  {
    storeId: "oura_local",
    keyPattern: "oura:",
    userScoped: false,
    containsHealthData: true,
    containsCredentials: false,
    signOut: "clear",
    accountSwitch: "clear",
    accountDeletion: "clear",
  },
  {
    storeId: "refresh_bus",
    keyPattern: "oli.refreshBus.v1:",
    userScoped: false,
    containsHealthData: false,
    containsCredentials: false,
    signOut: "clear",
    accountSwitch: "clear",
    accountDeletion: "clear",
  },
  {
    storeId: "export_temp_file",
    keyPattern: "oli-data-export.",
    userScoped: false,
    containsHealthData: true,
    containsCredentials: false,
    signOut: "clear",
    accountSwitch: "clear",
    accountDeletion: "clear",
  },
  {
    storeId: "deletion_recovery_marker",
    keyPattern: "oli:accountDeletion:recovery:v1",
    userScoped: false,
    containsHealthData: false,
    containsCredentials: false,
    signOut: "clear",
    accountSwitch: "preserve",
    accountDeletion: "preserve",
  },
] as const;

export const ACCOUNT_DELETION_RECOVERY_MARKER_KEY = "oli:accountDeletion:recovery:v1";

export type AccountDeletionRecoveryMarker = {
  phase: "cleanup_required" | "pending_signout";
};
