// lib/api/preferences.ts
import type { Preferences, MassUnit, WeeklyFitnessGoals } from "@oli/contracts";
import type { ApiResult } from "./http";
import { apiGetJsonAuthed, apiPutJsonAuthed } from "./http";
import { parsePreferencesFromApi } from "@/lib/preferences/parsePreferencesFromApi";

function parsePreferencesResult(
  res: Awaited<ReturnType<typeof apiGetJsonAuthed<unknown>>>,
): ApiResult<Preferences> {
  if (!res.ok) return res;

  try {
    const json = parsePreferencesFromApi(res.json);
    return {
      ok: true,
      status: res.status,
      requestId: res.requestId,
      json,
      ...(res.responseContentType !== undefined ? { responseContentType: res.responseContentType } : undefined),
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid response shape";
    return {
      ok: false,
      status: res.status,
      kind: "contract",
      error: "Invalid response shape",
      requestId: res.requestId,
      json: { message },
      ...(res.responseContentType !== undefined ? { responseContentType: res.responseContentType } : undefined),
    };
  }
}

export async function getPreferences(idToken: string): Promise<ApiResult<Preferences>> {
  const res = await apiGetJsonAuthed<unknown>("/preferences", idToken);
  return parsePreferencesResult(res);
}

export async function updateMassUnit(idToken: string, mass: MassUnit): Promise<ApiResult<Preferences>> {
  const body = { units: { mass } } as const;
  const res = await apiPutJsonAuthed<unknown>("/preferences", body, idToken);
  return parsePreferencesResult(res);
}

export async function updateSelectedGymId(
  idToken: string,
  selectedGymId: string | null,
): Promise<ApiResult<Preferences>> {
  const body = { selectedGymId };
  const res = await apiPutJsonAuthed<unknown>("/preferences", body, idToken);
  return parsePreferencesResult(res);
}

/** Data Sources: set or clear preferred source for one metric. Pass null to clear. */
export async function updateMetricSourcePreference(
  idToken: string,
  metricId: string,
  sourceId: string | null,
): Promise<ApiResult<Preferences>> {
  const body = { metricSources: { [metricId]: sourceId } };
  const res = await apiPutJsonAuthed<unknown>("/preferences", body, idToken);
  return parsePreferencesResult(res);
}

/** Update Dash Weekly Fitness goals. `updatedAt` is stamped server-side. */
export async function updateWeeklyFitnessGoals(
  idToken: string,
  goals: Pick<
    WeeklyFitnessGoals,
    | "activityStepsPerDayGoal"
    | "strengthWorkoutsPerWeekGoal"
    | "cardioMilesPerWeekGoal"
    | "sleepHoursPerNightGoal"
  >,
): Promise<ApiResult<Preferences>> {
  const body = { weeklyFitnessGoals: goals };
  const res = await apiPutJsonAuthed<unknown>("/preferences", body, idToken);
  return parsePreferencesResult(res);
}
