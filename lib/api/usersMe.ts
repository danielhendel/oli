// lib/api/usersMe.ts

import type { DayKey, DailyFactsDoc, InsightsResponse, IntelligenceContextDoc } from "./models";
import type { JsonValue } from "./http";
import { apiGetJsonAuthed } from "./http";

type NotFoundResult = { ok: false; status: 404; error: "not_found" };
type ErrorResult = { ok: false; status: number; error: "error"; message: string };
type OkResult<T> = { ok: true; status: 200; data: T };

export type ApiResult<T> = OkResult<T> | NotFoundResult | ErrorResult;

const encodeDay = (day: DayKey) => encodeURIComponent(day);

const getErrorMessage = (body: JsonValue | undefined): string | null => {
  if (!body || typeof body !== "object") return null;
  if (Array.isArray(body)) return null;

  const rec = body as Record<string, JsonValue>;
  const v = rec["error"];
  return typeof v === "string" ? v : null;
};

const mapError = (status: number, json: JsonValue | undefined): ErrorResult => {
  const msg = getErrorMessage(json) ?? "Request failed";
  return { ok: false, status, error: "error", message: msg };
};

export const getDailyFacts = async (day: DayKey, idToken: string): Promise<ApiResult<DailyFactsDoc>> => {
  const res = await apiGetJsonAuthed(`/users/me/daily-facts?day=${encodeDay(day)}`, idToken);

  if (res.ok) return { ok: true, status: 200, data: res.json as DailyFactsDoc };
  if (res.status === 404) return { ok: false, status: 404, error: "not_found" };

  return mapError(res.status, res.json);
};

export const getInsights = async (day: DayKey, idToken: string): Promise<ApiResult<InsightsResponse>> => {
  const res = await apiGetJsonAuthed(`/users/me/insights?day=${encodeDay(day)}`, idToken);

  if (res.ok) return { ok: true, status: 200, data: res.json as InsightsResponse };
  if (res.status === 404) return { ok: false, status: 404, error: "not_found" };

  return mapError(res.status, res.json);
};

export const getIntelligenceContext = async (
  day: DayKey,
  idToken: string
): Promise<ApiResult<IntelligenceContextDoc>> => {
  const res = await apiGetJsonAuthed(`/users/me/intelligence-context?day=${encodeDay(day)}`, idToken);

  if (res.ok) return { ok: true, status: 200, data: res.json as IntelligenceContextDoc };
  if (res.status === 404) return { ok: false, status: 404, error: "not_found" };

  return mapError(res.status, res.json);
};
