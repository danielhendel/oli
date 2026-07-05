/** Shared Today Command Center view model — single source for Dash, Timeline, Program surfaces. */

export type TodayScoreConfidence = "high" | "medium" | "low";

export type TodayScoreSource =
  | "oura"
  | "appleHealth"
  | "manual"
  | "oliEstimate"
  | (string & {});

export type ScoreFact = {
  value: number;
  source: TodayScoreSource;
  sourceLabel: string;
  observedAt: string | null;
  confidence: TodayScoreConfidence;
};

export type TodayReadinessStatus = "ready" | "moderate" | "take-it-easy" | "unknown";

export type TodayTargetId = "activity" | "workout" | "cardio" | "calories" | "protein";

export type TodayTargetUnit = "steps" | "workouts" | "miles" | "minutes" | "kcal" | "g";

export type TodayTargetStatus =
  | "notStarted"
  | "inProgress"
  | "complete"
  | "overTarget"
  | "missing";

export type TodayTargetProgress = {
  id: TodayTargetId;
  label: string;
  current: number | null;
  target: number | null;
  unit: TodayTargetUnit;
  progress: number;
  displayValue: string;
  status: TodayTargetStatus;
  routeTarget?: string;
  /** When true, target comes from typed defaults (not user persistence). */
  usesDefaultTarget: boolean;
  /** Optional subline, e.g. "Default target" or weekly-goal context. */
  secondaryLine?: string | null;
  /** When false, row is informational and excluded from completion percent. */
  includeInCompletion: boolean;
};

export type TodayCommandModel = {
  day: string;
  timezone: string;
  completionPercent: number;
  readiness: {
    status: TodayReadinessStatus;
    headline: string;
    sleepScore: ScoreFact | null;
    readinessScore: ScoreFact | null;
    priorDaySteps: number | null;
    priorDayCaloriesBurned: number | null;
    sourceLabel: string | null;
    confidence: TodayScoreConfidence;
  };
  targets: TodayTargetProgress[];
  lastUpdatedAt: string | null;
};

export type TodayCommandReadiness = TodayCommandModel["readiness"];
