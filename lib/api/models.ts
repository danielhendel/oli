// lib/api/models.ts

export type DayKey = string; // "YYYY-MM-DD" validated on server

export type DailyFactsDoc = Record<string, unknown>;

export type InsightsResponse = {
  day: string;
  count: number;
  items: Record<string, unknown>[];
};

export type IntelligenceContextDoc = Record<string, unknown>;
