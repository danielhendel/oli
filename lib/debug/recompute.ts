// lib/debug/recompute.ts

import { getIdToken } from "../auth/getIdToken";
import { callAdminFunction } from "../api/functions";
import { getTodayDayKey } from "../time/dayKey";

export type RecomputeResult =
  | { ok: true; date: string; details: { dailyFacts: string; insights: string; context: string } }
  | { ok: false; step: "dailyFacts" | "insights" | "context"; error: string };

export const recomputeTodayPipeline = async (userId: string): Promise<RecomputeResult> => {
  const idToken = await getIdToken();
  const date = getTodayDayKey();

  // 1) DailyFacts
  const r1 = await callAdminFunction("recomputeDailyFactsAdminHttp", { userId, date }, idToken);
  if (!r1.ok) return { ok: false, step: "dailyFacts", error: r1.error };

  // 2) Insights
  const r2 = await callAdminFunction("recomputeInsightsAdminHttp", { userId, date }, idToken);
  if (!r2.ok) return { ok: false, step: "insights", error: r2.error };

  // 3) IntelligenceContext
  const r3 = await callAdminFunction("recomputeDailyIntelligenceContextAdminHttp", { userId, date }, idToken);
  if (!r3.ok) return { ok: false, step: "context", error: r3.error };

  return {
    ok: true,
    date,
    details: {
      dailyFacts: "ok",
      insights: "ok",
      context: "ok",
    },
  };
};
