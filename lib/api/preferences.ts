// lib/api/preferences.ts
import { preferencesSchema, type Preferences, type MassUnit } from "@oli/contracts";
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
