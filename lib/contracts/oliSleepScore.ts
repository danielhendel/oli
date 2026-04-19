import { z } from "zod";

export const OLI_SLEEP_SCORE_VERSION = "sleep-score-v1.0.0" as const;

const scoreComponentsSchema = z.object({
  duration: z.number().finite().min(0).max(1).nullable(),
  efficiency: z.number().finite().min(0).max(1).nullable(),
  latency: z.number().finite().min(0).max(1).nullable(),
  rem: z.number().finite().min(0).max(1).nullable(),
  deep: z.number().finite().min(0).max(1).nullable(),
});

const scoreWeightsSchema = z.object({
  duration: z.number().finite().nonnegative(),
  efficiency: z.number().finite().nonnegative(),
  latency: z.number().finite().nonnegative(),
  rem: z.number().finite().nonnegative(),
  deep: z.number().finite().nonnegative(),
});

/** Derived Oli Sleep Score v1 — persisted under DailyFacts.sleep.oliSleepScore */
export const oliSleepScoreV1Schema = z.object({
  value: z.number().int().min(0).max(100).nullable(),
  version: z.literal(OLI_SLEEP_SCORE_VERSION),
  computedAt: z.string().min(1),
  confidence: z.number().finite().min(0).max(1),
  components: scoreComponentsSchema,
  weights: scoreWeightsSchema,
  reasons: z.array(z.string().min(1)).max(8),
});

export type OliSleepScoreV1 = z.infer<typeof oliSleepScoreV1Schema>;
