/**
 * Typed registry of user-data sources and ownership (Phase 3B).
 * Pure — no React, no Firebase I/O.
 */

export const USER_DATA_SOURCE_IDS = [
  "firebase_auth",
  "profile_general",
  "profile_main",
  "preferences",
  "apple_health",
  "oura",
  "withings",
  "manual_strength",
  "manual_cardio",
  "manual_nutrition",
  "manual_body",
  "labs_upload",
  "scans_upload",
  "dna_upload",
  "medical_history",
  "medications",
  "supplements",
  "daily_facts",
  "raw_events",
  "workout_journal",
  "workout_summaries",
] as const;

export type UserDataSourceId = (typeof USER_DATA_SOURCE_IDS)[number];

export type UserDataSourceCategory =
  | "identity"
  | "profile"
  | "preferences"
  | "device"
  | "manual"
  | "upload"
  | "placeholder"
  | "derived"
  | "events"
  | "workouts";

export type UserDataSourceOwnership = "oli" | "provider" | "user" | "legacy";

export type UserDataConnectionType =
  | "auth"
  | "document"
  | "oauth"
  | "healthkit"
  | "manual_entry"
  | "file_upload"
  | "derived"
  | "none";

export type UserDataSupportStatus =
  | "active"
  | "legacy_orphaned"
  | "placeholder"
  | "derived_only"
  | "local_only";

export type UserDataSourceDefinition = {
  sourceId: UserDataSourceId;
  displayName: string;
  category: UserDataSourceCategory;
  ownership: UserDataSourceOwnership;
  connectionType: UserDataConnectionType;
  supportStatus: UserDataSupportStatus;
  syncCapable: boolean;
  historicalCapable: boolean;
  normalizedCapable: boolean;
  exportCapable: boolean;
  deletionCapable: boolean;
  providerAttribution: string | null;
  /** Whether this source is treated as current product truth for state. */
  currentProductTruth: boolean;
  legacyOrphaned: boolean;
  placeholder: boolean;
};

function def(
  partial: UserDataSourceDefinition,
): UserDataSourceDefinition {
  return partial;
}

export const USER_DATA_SOURCE_REGISTRY = {
  firebase_auth: def({
    sourceId: "firebase_auth",
    displayName: "Account identity",
    category: "identity",
    ownership: "oli",
    connectionType: "auth",
    supportStatus: "active",
    syncCapable: false,
    historicalCapable: false,
    normalizedCapable: true,
    exportCapable: false,
    deletionCapable: true,
    providerAttribution: "Firebase Auth",
    currentProductTruth: true,
    legacyOrphaned: false,
    placeholder: false,
  }),
  profile_general: def({
    sourceId: "profile_general",
    displayName: "Profile (general)",
    category: "profile",
    ownership: "oli",
    connectionType: "document",
    supportStatus: "active",
    syncCapable: false,
    historicalCapable: false,
    normalizedCapable: true,
    exportCapable: true,
    deletionCapable: true,
    providerAttribution: null,
    currentProductTruth: true,
    legacyOrphaned: false,
    placeholder: false,
  }),
  profile_main: def({
    sourceId: "profile_main",
    displayName: "Profile (main)",
    category: "profile",
    ownership: "user",
    connectionType: "document",
    supportStatus: "active",
    syncCapable: false,
    historicalCapable: false,
    normalizedCapable: true,
    exportCapable: true,
    deletionCapable: true,
    providerAttribution: null,
    currentProductTruth: true,
    legacyOrphaned: false,
    placeholder: false,
  }),
  preferences: def({
    sourceId: "preferences",
    displayName: "Preferences",
    category: "preferences",
    ownership: "user",
    connectionType: "document",
    supportStatus: "active",
    syncCapable: false,
    historicalCapable: false,
    normalizedCapable: true,
    exportCapable: false,
    deletionCapable: true,
    providerAttribution: null,
    currentProductTruth: true,
    legacyOrphaned: false,
    placeholder: false,
  }),
  apple_health: def({
    sourceId: "apple_health",
    displayName: "Apple Health",
    category: "device",
    ownership: "provider",
    connectionType: "healthkit",
    supportStatus: "active",
    syncCapable: true,
    historicalCapable: true,
    normalizedCapable: true,
    exportCapable: true,
    deletionCapable: true,
    providerAttribution: "Apple Health",
    currentProductTruth: true,
    legacyOrphaned: false,
    placeholder: false,
  }),
  oura: def({
    sourceId: "oura",
    displayName: "Oura",
    category: "device",
    ownership: "provider",
    connectionType: "oauth",
    supportStatus: "active",
    syncCapable: true,
    historicalCapable: true,
    normalizedCapable: true,
    exportCapable: true,
    deletionCapable: true,
    providerAttribution: "Oura",
    currentProductTruth: true,
    legacyOrphaned: false,
    placeholder: false,
  }),
  withings: def({
    sourceId: "withings",
    displayName: "Withings",
    category: "device",
    ownership: "legacy",
    connectionType: "oauth",
    supportStatus: "legacy_orphaned",
    syncCapable: false,
    historicalCapable: true,
    normalizedCapable: false,
    exportCapable: true,
    deletionCapable: true,
    providerAttribution: "Withings",
    currentProductTruth: false,
    legacyOrphaned: true,
    placeholder: false,
  }),
  manual_strength: def({
    sourceId: "manual_strength",
    displayName: "Manual strength",
    category: "manual",
    ownership: "user",
    connectionType: "manual_entry",
    supportStatus: "active",
    syncCapable: false,
    historicalCapable: true,
    normalizedCapable: true,
    exportCapable: true,
    deletionCapable: true,
    providerAttribution: null,
    currentProductTruth: true,
    legacyOrphaned: false,
    placeholder: false,
  }),
  manual_cardio: def({
    sourceId: "manual_cardio",
    displayName: "Manual cardio",
    category: "manual",
    ownership: "user",
    connectionType: "manual_entry",
    supportStatus: "active",
    syncCapable: false,
    historicalCapable: true,
    normalizedCapable: true,
    exportCapable: true,
    deletionCapable: true,
    providerAttribution: null,
    currentProductTruth: true,
    legacyOrphaned: false,
    placeholder: false,
  }),
  manual_nutrition: def({
    sourceId: "manual_nutrition",
    displayName: "Manual nutrition",
    category: "manual",
    ownership: "user",
    connectionType: "manual_entry",
    supportStatus: "active",
    syncCapable: false,
    historicalCapable: true,
    normalizedCapable: true,
    exportCapable: true,
    deletionCapable: true,
    providerAttribution: null,
    currentProductTruth: true,
    legacyOrphaned: false,
    placeholder: false,
  }),
  manual_body: def({
    sourceId: "manual_body",
    displayName: "Manual body",
    category: "manual",
    ownership: "user",
    connectionType: "manual_entry",
    supportStatus: "active",
    syncCapable: false,
    historicalCapable: true,
    normalizedCapable: true,
    exportCapable: true,
    deletionCapable: true,
    providerAttribution: null,
    currentProductTruth: true,
    legacyOrphaned: false,
    placeholder: false,
  }),
  labs_upload: def({
    sourceId: "labs_upload",
    displayName: "Labs uploads",
    category: "upload",
    ownership: "user",
    connectionType: "file_upload",
    supportStatus: "active",
    syncCapable: false,
    historicalCapable: true,
    normalizedCapable: false,
    exportCapable: false,
    deletionCapable: false,
    providerAttribution: null,
    currentProductTruth: false,
    legacyOrphaned: false,
    placeholder: false,
  }),
  scans_upload: def({
    sourceId: "scans_upload",
    displayName: "Scans uploads",
    category: "placeholder",
    ownership: "user",
    connectionType: "file_upload",
    supportStatus: "placeholder",
    syncCapable: false,
    historicalCapable: false,
    normalizedCapable: false,
    exportCapable: false,
    deletionCapable: false,
    providerAttribution: null,
    currentProductTruth: false,
    legacyOrphaned: false,
    placeholder: true,
  }),
  dna_upload: def({
    sourceId: "dna_upload",
    displayName: "DNA uploads",
    category: "placeholder",
    ownership: "user",
    connectionType: "file_upload",
    supportStatus: "placeholder",
    syncCapable: false,
    historicalCapable: false,
    normalizedCapable: false,
    exportCapable: false,
    deletionCapable: false,
    providerAttribution: null,
    currentProductTruth: false,
    legacyOrphaned: false,
    placeholder: true,
  }),
  medical_history: def({
    sourceId: "medical_history",
    displayName: "Medical history",
    category: "placeholder",
    ownership: "user",
    connectionType: "none",
    supportStatus: "placeholder",
    syncCapable: false,
    historicalCapable: false,
    normalizedCapable: false,
    exportCapable: false,
    deletionCapable: false,
    providerAttribution: null,
    currentProductTruth: false,
    legacyOrphaned: false,
    placeholder: true,
  }),
  medications: def({
    sourceId: "medications",
    displayName: "Medications",
    category: "placeholder",
    ownership: "user",
    connectionType: "none",
    supportStatus: "placeholder",
    syncCapable: false,
    historicalCapable: false,
    normalizedCapable: false,
    exportCapable: false,
    deletionCapable: false,
    providerAttribution: null,
    currentProductTruth: false,
    legacyOrphaned: false,
    placeholder: true,
  }),
  supplements: def({
    sourceId: "supplements",
    displayName: "Supplements",
    category: "placeholder",
    ownership: "user",
    connectionType: "none",
    supportStatus: "placeholder",
    syncCapable: false,
    historicalCapable: false,
    normalizedCapable: false,
    exportCapable: false,
    deletionCapable: false,
    providerAttribution: null,
    currentProductTruth: false,
    legacyOrphaned: false,
    placeholder: true,
  }),
  daily_facts: def({
    sourceId: "daily_facts",
    displayName: "Daily facts",
    category: "derived",
    ownership: "oli",
    connectionType: "derived",
    supportStatus: "derived_only",
    syncCapable: false,
    historicalCapable: true,
    normalizedCapable: true,
    exportCapable: true,
    deletionCapable: true,
    providerAttribution: null,
    currentProductTruth: true,
    legacyOrphaned: false,
    placeholder: false,
  }),
  raw_events: def({
    sourceId: "raw_events",
    displayName: "Raw events",
    category: "events",
    ownership: "oli",
    connectionType: "derived",
    supportStatus: "active",
    syncCapable: false,
    historicalCapable: true,
    normalizedCapable: false,
    exportCapable: true,
    deletionCapable: true,
    providerAttribution: null,
    currentProductTruth: true,
    legacyOrphaned: false,
    placeholder: false,
  }),
  workout_journal: def({
    sourceId: "workout_journal",
    displayName: "Workout journal (local)",
    category: "workouts",
    ownership: "user",
    connectionType: "manual_entry",
    supportStatus: "local_only",
    syncCapable: false,
    historicalCapable: true,
    normalizedCapable: false,
    exportCapable: false,
    deletionCapable: false,
    providerAttribution: null,
    currentProductTruth: false,
    legacyOrphaned: false,
    placeholder: false,
  }),
  workout_summaries: def({
    sourceId: "workout_summaries",
    displayName: "Workout summaries",
    category: "workouts",
    ownership: "oli",
    connectionType: "derived",
    supportStatus: "active",
    syncCapable: false,
    historicalCapable: true,
    normalizedCapable: true,
    exportCapable: false,
    deletionCapable: false,
    providerAttribution: null,
    currentProductTruth: true,
    legacyOrphaned: false,
    placeholder: false,
  }),
} as const satisfies Record<UserDataSourceId, UserDataSourceDefinition>;

export function getUserDataSource(sourceId: UserDataSourceId): UserDataSourceDefinition {
  return USER_DATA_SOURCE_REGISTRY[sourceId];
}

export function listUserDataSources(): readonly UserDataSourceDefinition[] {
  return USER_DATA_SOURCE_IDS.map((id) => USER_DATA_SOURCE_REGISTRY[id]);
}

export function assertExhaustiveUserDataSourceIds(): readonly UserDataSourceId[] {
  return USER_DATA_SOURCE_IDS;
}
