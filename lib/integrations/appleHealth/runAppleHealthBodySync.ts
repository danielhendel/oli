import type { AppleHealthBodyWeightSample } from "./healthKit";

export type RunAppleHealthBodySyncDeps = {
  pullBodyCompositionSamples: (opts: {
    startDate: string;
    endDate: string;
    limit?: number;
  }) => Promise<{ ok: true; data: AppleHealthBodyWeightSample[] } | { ok: false; error: string }>;
  ingestRawEvent: (
    body: unknown,
    token: string,
    opts: { idempotencyKey: string; timeoutMs: number },
  ) => Promise<{ ok: true } | { ok: false; error: string; requestId: string | null }>;
  appleHealthBodyWeightIdempotencyKey: (params: {
    observedAtIso: string;
    sourceId?: string | null;
  }) => string;
  appleHealthBodyCompositionIdempotencyKey: (params: {
    observedAtIso: string;
    sourceId?: string | null;
    metric: "bodyFatPercent" | "bmi" | "leanBodyMassKg" | "restingMetabolicRateKcal";
  }) => string;
  getDeviceTimezone: () => string;
};

export type RunAppleHealthBodySyncResult =
  | { ok: true; ingested: number; replayedOrSkipped: number; samplesRead: number }
  | { ok: false; error: string; requestId: string | null };

function isFinitePositiveWeightKg(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n > 0;
}

/** 0–100 inclusive; rejects NaN (typeof number) which would fail RawEvent contract. */
function optionalBodyFatPercentForPayload(n: unknown): number | undefined {
  if (typeof n !== "number" || !Number.isFinite(n)) return undefined;
  if (n < 0 || n > 100) return undefined;
  return n;
}

function optionalFiniteNonNegative(n: unknown): number | undefined {
  if (typeof n !== "number" || !Number.isFinite(n)) return undefined;
  if (n < 0) return undefined;
  return n;
}

export async function ingestAppleHealthBodySamples(
  opts: { token: string; samples: AppleHealthBodyWeightSample[] },
  deps: Omit<RunAppleHealthBodySyncDeps, "pullBodyCompositionSamples">,
): Promise<{ ok: true; ingested: number; replayedOrSkipped: number; samplesRead: number } | { ok: false; error: string; requestId: string | null }> {
  const timezone = deps.getDeviceTimezone();
  let ingested = 0;
  const replayedOrSkipped = 0;
  for (const sample of opts.samples) {
    if (isFinitePositiveWeightKg(sample.weightKg)) {
      const idempotencyKey = deps.appleHealthBodyWeightIdempotencyKey({
        observedAtIso: sample.observedAt,
        sourceId: sample.sourceId,
      });
      const bf = optionalBodyFatPercentForPayload(sample.bodyFatPercent);
      const payload = {
        time: sample.observedAt,
        timezone,
        weightKg: sample.weightKg,
        ...(bf !== undefined ? { bodyFatPercent: bf } : {}),
      };
      const body = {
        provider: "apple_health" as const,
        sourceId: "apple_health",
        kind: "weight" as const,
        observedAt: sample.observedAt,
        timeZone: timezone,
        payload,
      };
      const res = await deps.ingestRawEvent(body, opts.token, {
        idempotencyKey,
        timeoutMs: 15000,
      });
      if (!res.ok) {
        return { ok: false, error: res.error, requestId: res.requestId };
      }
      ingested += 1;
    }

    const compositionMetrics: [
      "bodyFatPercent" | "bmi" | "leanBodyMassKg" | "restingMetabolicRateKcal",
      number,
    ][] = [];
    if (sample.weightKg == null) {
      const bfOnly = optionalBodyFatPercentForPayload(sample.bodyFatPercent);
      if (bfOnly !== undefined) compositionMetrics.push(["bodyFatPercent", bfOnly]);
    }
    const bmi = optionalFiniteNonNegative(sample.bmi);
    if (bmi !== undefined) compositionMetrics.push(["bmi", bmi]);
    const lean = optionalFiniteNonNegative(sample.leanBodyMassKg);
    if (lean !== undefined) compositionMetrics.push(["leanBodyMassKg", lean]);
    const rmr = optionalFiniteNonNegative(sample.restingMetabolicRateKcal);
    if (rmr !== undefined) compositionMetrics.push(["restingMetabolicRateKcal", rmr]);

    for (const [metric, value] of compositionMetrics) {
      const idempotencyKey = deps.appleHealthBodyCompositionIdempotencyKey({
        observedAtIso: sample.observedAt,
        sourceId: sample.sourceId,
        metric,
      });
      const payload = {
        time: sample.observedAt,
        timezone,
        [metric]: value,
      };
      const body = {
        provider: "apple_health" as const,
        sourceId: "apple_health",
        kind: "body_composition" as const,
        observedAt: sample.observedAt,
        timeZone: timezone,
        payload,
      };
      const res = await deps.ingestRawEvent(body, opts.token, {
        idempotencyKey,
        timeoutMs: 15000,
      });
      if (!res.ok) {
        return { ok: false, error: res.error, requestId: res.requestId };
      }
      ingested += 1;
    }
  }
  return { ok: true, ingested, replayedOrSkipped, samplesRead: opts.samples.length };
}

export async function runAppleHealthBodySync(
  opts: { token: string; startDate: string; endDate: string; limit?: number },
  deps: RunAppleHealthBodySyncDeps,
): Promise<RunAppleHealthBodySyncResult> {
  const pulled = await deps.pullBodyCompositionSamples({
    startDate: opts.startDate,
    endDate: opts.endDate,
    ...(typeof opts.limit === "number" ? { limit: opts.limit } : {}),
  });
  if (!pulled.ok) {
    return { ok: false, error: pulled.error, requestId: null };
  }
  return ingestAppleHealthBodySamples(
    { token: opts.token, samples: pulled.data },
    {
      ingestRawEvent: deps.ingestRawEvent,
      appleHealthBodyWeightIdempotencyKey: deps.appleHealthBodyWeightIdempotencyKey,
      appleHealthBodyCompositionIdempotencyKey: deps.appleHealthBodyCompositionIdempotencyKey,
      getDeviceTimezone: deps.getDeviceTimezone,
    },
  );
}

