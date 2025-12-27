// lib/api/usersMe.ts
import { apiGetJsonAuthed, type ApiResult } from "@/lib/api/http";

export type DayKey = string;

export type DailyFactsDto = {
  schemaVersion: 1;
  userId: string;
  date: DayKey;
  computedAt: string;
  sleep?: { totalMinutes?: number };
  activity?: { steps?: number; trainingLoad?: number };
  recovery?: { hrvRmssd?: number; hrvRmssdBaseline?: number; hrvRmssdDeviation?: number };
  body?: { weightKg?: number; bodyFatPercent?: number };
  nutrition?: { totalKcal?: number; proteinG?: number; carbsG?: number; fatG?: number };
  confidence?: Record<string, number>;
};

export type InsightDto = {
  schemaVersion: 1;
  id: string;
  userId: string;
  date: DayKey;
  kind: string;
  title: string;
  message: string;
  severity: "info" | "warning" | "critical";
  evidence: Array<{
    factPath: string;
    value: string | number | boolean | null;
    threshold?: number;
    direction?: "above" | "below" | "outside_range";
  }>;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  ruleVersion: string;
};

export type InsightsResponseDto = {
  day: DayKey;
  count: number;
  items: InsightDto[];
};

export type IntelligenceContextDto = {
  schemaVersion: 1;
  version: string;
  id: DayKey;
  userId: string;
  date: DayKey;
  computedAt: string;
  facts: {
    sleepTotalMinutes?: number;
    steps?: number;
    trainingLoad?: number;
    hrvRmssd?: number;
    hrvRmssdBaseline?: number;
    hrvRmssdDeviation?: number;
    weightKg?: number;
    bodyFatPercent?: number;
  };
  confidence?: Record<string, number>;
  insights: {
    count: number;
    bySeverity: { info: number; warning: number; critical: number };
    tags: string[];
    kinds: string[];
    ids: string[];
  };
  readiness: {
    hasDailyFacts: boolean;
    hasInsights: boolean;
    domainMeetsConfidence?: Record<string, boolean>;
  };
};

export const getDailyFacts = async (day: string, token: string): Promise<ApiResult<DailyFactsDto>> => {
  return apiGetJsonAuthed<DailyFactsDto>(`/users/me/daily-facts?day=${encodeURIComponent(day)}`, token);
};

export const getInsights = async (day: string, token: string): Promise<ApiResult<InsightsResponseDto>> => {
  return apiGetJsonAuthed<InsightsResponseDto>(`/users/me/insights?day=${encodeURIComponent(day)}`, token);
};

export const getIntelligenceContext = async (day: string, token: string): Promise<ApiResult<IntelligenceContextDto>> => {
  return apiGetJsonAuthed<IntelligenceContextDto>(`/users/me/intelligence-context?day=${encodeURIComponent(day)}`, token);
};
