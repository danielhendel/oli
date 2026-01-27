// services/functions/src/pipeline/pipelineMeta.ts

import type { IsoDateTimeString, PipelineMeta } from "../types/health";

export const PIPELINE_VERSION = 1 as const;

export const buildPipelineMeta = (args: {
  computedAt: IsoDateTimeString;
  source?: Record<string, unknown>;
}): PipelineMeta => ({
  computedAt: args.computedAt,
  pipelineVersion: PIPELINE_VERSION,
  ...(args.source ? { source: args.source } : {}),
});