// lib/api/usersMe.ts
import { apiGetJsonAuthed } from "./http";
import type { ApiResult } from "./http";

// Canonical "me" read endpoints
export const getMyDailyFacts = async (day: string, idToken: string): Promise<ApiResult> => {
  return apiGetJsonAuthed(`/users/me/daily-facts/${encodeURIComponent(day)}`, idToken);
};

export const getMyInsights = async (day: string, idToken: string): Promise<ApiResult> => {
  return apiGetJsonAuthed(`/users/me/insights/${encodeURIComponent(day)}`, idToken);
};

export const getMyIntelligenceContext = async (day: string, idToken: string): Promise<ApiResult> => {
  return apiGetJsonAuthed(`/users/me/intelligence-context/${encodeURIComponent(day)}`, idToken);
};

// ✅ Back-compat aliases (existing hooks expect these names)
export const getDailyFacts = getMyDailyFacts;
export const getInsights = getMyInsights;
export const getIntelligenceContext = getMyIntelligenceContext;
