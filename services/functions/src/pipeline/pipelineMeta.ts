// services/functions/src/pipeline/pipelineMeta.ts

import type { IsoDateTimeString } from "../types/health";

export const PIPELINE_VERSION = 1 as const;

export type PipelineMeta = {
  computedAt: IsoDateTimeString;
  pipelineVersion: number;
  source?: Record<string, unknown>;
};

export const buildPipelineMeta = (args: {
  computedAt: IsoDateTimeString;
  source?: Record<string, unknown>;
}): PipelineMeta => ({
  computedAt: args.computedAt,
  pipelineVersion: PIPELINE_VERSION,
  ...(args.source ? { source: args.source } : {}),
});
