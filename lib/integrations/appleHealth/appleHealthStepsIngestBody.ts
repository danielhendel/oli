/**
 * Single shape for Apple Health → POST /ingest `kind: "steps"` (matches anchored sync).
 * Keeps payload aligned with {@link runAnchoredWorkoutsSync} and server contracts.
 */
export function buildAppleHealthStepsIngestBody(params: {
  start: string;
  end: string;
  day: string;
  timezone: string;
  steps: number;
}): {
  provider: "apple_health";
  sourceId: string;
  kind: "steps";
  observedAt: string;
  timeZone: string;
  payload: {
    start: string;
    end: string;
    timezone: string;
    day: string;
    steps: number;
    sync: { mode: "range"; anchorVersion: 1; anchorUsed: boolean };
  };
} {
  const { start, end, day, timezone, steps } = params;
  return {
    provider: "apple_health",
    sourceId: "healthkit",
    kind: "steps",
    observedAt: start,
    timeZone: timezone,
    payload: {
      start,
      end,
      timezone,
      day,
      steps,
      sync: { mode: "range" as const, anchorVersion: 1, anchorUsed: false },
    },
  };
}
