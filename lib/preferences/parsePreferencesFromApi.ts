import {
  defaultPreferences,
  mergeStoredPreferences,
  preferencesSchema,
  type Preferences,
} from "@oli/contracts";

/**
 * Fail-closed parse for GET/PUT /preferences JSON: shallow-merge defaults, coerce nested
 * weeklyFitnessGoals (e.g. legacy docs missing sleepHoursPerNightGoal), then Zod validate.
 */
export function parsePreferencesFromApi(json: unknown): Preferences {
  const base =
    json != null && typeof json === "object" && !Array.isArray(json)
      ? { ...defaultPreferences(), ...(json as Record<string, unknown>) }
      : defaultPreferences();
  const merged = mergeStoredPreferences(base as Record<string, unknown>);
  return preferencesSchema.parse(merged);
}
