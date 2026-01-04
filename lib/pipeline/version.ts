// lib/pipeline/version.ts

/**
 * MUST match services/functions/src/pipeline/pipelineMeta.ts
 * This is the UI gate to prevent "fresh timestamps on old semantics".
 */
export const PIPELINE_VERSION = 1 as const;
