/**
 * Typed Apple Health domain registry — single mobile source of truth for
 * progressive domain permission bundles (Stage 3B).
 *
 * One account-level Apple Health source; domains request only their implemented types.
 * Central Settings may optionally Connect all supported data via the typed union.
 */

export type AppleHealthDomain =
  | "body"
  | "activity"
  | "workouts"
  | "cardioVitals"
  | "sleepRecovery"
  | "nutrition";

/** HealthKit permission string identifiers used by react-native-health / Oli. */
export type AppleHealthReadType = string;

export type AppleHealthImportPolicy =
  | "latest_then_bounded_history"
  | "incremental_only"
  | "none";

export type AppleHealthDomainDefinition = {
  readonly id: AppleHealthDomain;
  readonly displayName: string;
  /** Consumer-facing metric names for access summary (no HealthKit ids). */
  readonly consumerMetrics: readonly string[];
  readonly readTypes: readonly AppleHealthReadType[];
  readonly importPolicy: AppleHealthImportPolicy;
  readonly implemented: boolean;
};

/**
 * Body Composition card / sheet — Weight, Body Fat %, Lean Body Mass only.
 * Do not expand without product approval.
 */
export const APPLE_HEALTH_BODY_READ_TYPES: readonly AppleHealthReadType[] = [
  "BodyMass",
  "BodyFatPercentage",
  "LeanBodyMass",
] as const;

export const APPLE_HEALTH_ACTIVITY_READ_TYPES: readonly AppleHealthReadType[] = [
  "StepCount",
  "DistanceWalkingRunning",
  "AppleExerciseTime",
  "ActiveEnergyBurned",
] as const;

export const APPLE_HEALTH_WORKOUTS_READ_TYPES: readonly AppleHealthReadType[] = [
  "Workout",
] as const;

export const APPLE_HEALTH_CARDIO_VITALS_READ_TYPES: readonly AppleHealthReadType[] = [
  "RestingHeartRate",
  "HeartRate",
] as const;

export const APPLE_HEALTH_DOMAIN_REGISTRY: readonly AppleHealthDomainDefinition[] = [
  {
    id: "body",
    displayName: "Body Composition",
    consumerMetrics: ["Weight", "Body Fat", "Lean Tissue"],
    readTypes: APPLE_HEALTH_BODY_READ_TYPES,
    importPolicy: "latest_then_bounded_history",
    implemented: true,
  },
  {
    id: "activity",
    displayName: "Activity",
    consumerMetrics: ["Steps", "Active Energy", "Exercise Minutes", "Distance"],
    readTypes: APPLE_HEALTH_ACTIVITY_READ_TYPES,
    importPolicy: "incremental_only",
    implemented: true,
  },
  {
    id: "workouts",
    displayName: "Workouts",
    consumerMetrics: ["Workout records"],
    readTypes: APPLE_HEALTH_WORKOUTS_READ_TYPES,
    importPolicy: "incremental_only",
    implemented: true,
  },
  {
    id: "cardioVitals",
    displayName: "Cardio & Vitals",
    consumerMetrics: ["Heart Rate", "Resting Heart Rate"],
    readTypes: APPLE_HEALTH_CARDIO_VITALS_READ_TYPES,
    importPolicy: "incremental_only",
    implemented: true,
  },
  {
    id: "sleepRecovery",
    displayName: "Sleep & Recovery",
    consumerMetrics: [],
    readTypes: [],
    importPolicy: "none",
    implemented: false,
  },
  {
    id: "nutrition",
    displayName: "Nutrition",
    consumerMetrics: [],
    readTypes: [],
    importPolicy: "none",
    implemented: false,
  },
] as const;

export function getAppleHealthDomainDefinition(
  id: AppleHealthDomain,
): AppleHealthDomainDefinition {
  const found = APPLE_HEALTH_DOMAIN_REGISTRY.find((d) => d.id === id);
  if (!found) {
    throw new Error(`Unknown Apple Health domain: ${id}`);
  }
  return found;
}

export function listImplementedAppleHealthDomains(): readonly AppleHealthDomainDefinition[] {
  return APPLE_HEALTH_DOMAIN_REGISTRY.filter((d) => d.implemented);
}

/** Typed union for Settings → Connect all supported data (implemented domains only). */
export function buildAppleHealthConnectAllReadTypes(): readonly AppleHealthReadType[] {
  const set = new Set<AppleHealthReadType>();
  for (const domain of listImplementedAppleHealthDomains()) {
    for (const t of domain.readTypes) set.add(t);
  }
  return [...set];
}

export function assertBodyBundleExcludesUnrelatedTypes(
  types: readonly AppleHealthReadType[],
): void {
  const forbidden = [
    "StepCount",
    "Workout",
    "HeartRate",
    "RestingHeartRate",
    "ActiveEnergyBurned",
    "AppleExerciseTime",
    "DistanceWalkingRunning",
    "BodyMassIndex",
    "BasalEnergyBurned",
  ];
  for (const f of forbidden) {
    if (types.includes(f)) {
      throw new Error(`Body bundle must not include ${f}`);
    }
  }
}
