// lib/api/preferences.ts
import { preferencesSchema, type Preferences, type MassUnit } from "@oli/contracts";
import { apiGetJsonAuthed, apiPutJsonAuthed, type ApiResult } from "./http";

export async function getPreferences(idToken: string): Promise<ApiResult<Preferences>> {
  const res = await apiGetJsonAuthed<unknown>("/preferences", idToken);

  if (!res.ok) return res;

  const parsed = preferencesSchema.safeParse(res.json);
  if (!parsed.success) {
    return {
      ok: false,
      status: res.status,
      kind: "parse",
      error: "Invalid preferences response",
      requestId: res.requestId,
      json: {
        // safe, JSON-serializable details for debugging
        issues: parsed.error.issues.map((i) => ({
          path: i.path.map(String),
          message: i.message,
        })),
      },
    };
  }

  return {
    ok: true,
    status: res.status,
    requestId: res.requestId,
    json: parsed.data,
  };
}

export async function updateMassUnit(idToken: string, mass: MassUnit): Promise<ApiResult<Preferences>> {
  const body = { units: { mass } } as const;

  const res = await apiPutJsonAuthed<unknown>("/preferences", body, idToken);

  if (!res.ok) return res;

  const parsed = preferencesSchema.safeParse(res.json);
  if (!parsed.success) {
    return {
      ok: false,
      status: res.status,
      kind: "parse",
      error: "Invalid preferences response",
      requestId: res.requestId,
      json: {
        issues: parsed.error.issues.map((i) => ({
          path: i.path.map(String),
          message: i.message,
        })),
      },
    };
  }

  return {
    ok: true,
    status: res.status,
    requestId: res.requestId,
    json: parsed.data,
  };
}
