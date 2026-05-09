// lib/api/preferences.ts
import {
  preferencesSchema,
  type Preferences,
  type MassUnit,
  type WeeklyFitnessGoals,
} from "@oli/contracts";
import type { ApiResult } from "./http";
import { apiGetZodAuthed, apiPutZodAuthed } from "./validate";

export async function getPreferences(idToken: string): Promise<ApiResult<Preferences>> {
  return apiGetZodAuthed("/preferences", idToken, preferencesSchema);
}

export async function updateMassUnit(idToken: string, mass: MassUnit): Promise<ApiResult<Preferences>> {
  const body = { units: { mass } } as const;
  return apiPutZodAuthed("/preferences", body, idToken, preferencesSchema);
}

export async function updateSelectedGymId(
  idToken: string,
  selectedGymId: string | null,
): Promise<ApiResult<Preferences>> {
  const body = { selectedGymId };
  return apiPutZodAuthed("/preferences", body, idToken, preferencesSchema);
}

/** Data Sources: set or clear preferred source for one metric. Pass null to clear. */
export async function updateMetricSourcePreference(
  idToken: string,
  metricId: string,
  sourceId: string | null,
): Promise<ApiResult<Preferences>> {
  const body = { metricSources: { [metricId]: sourceId } };
  return apiPutZodAuthed("/preferences", body, idToken, preferencesSchema);
}

/**
 * Update Dash Weekly Fitness goals. `updatedAt` is stamped server-side; clients send only the
 * three numeric fields.
 */
export async function updateWeeklyFitnessGoals(
  idToken: string,
  goals: Pick<
    WeeklyFitnessGoals,
    "activityStepsPerDayGoal" | "strengthWorkoutsPerWeekGoal" | "cardioMilesPerWeekGoal"
  >,
): Promise<ApiResult<Preferences>> {
  const body = { weeklyFitnessGoals: goals };
  return apiPutZodAuthed("/preferences", body, idToken, preferencesSchema);
}
