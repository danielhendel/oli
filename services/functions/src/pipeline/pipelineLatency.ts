// services/functions/src/pipeline/pipelineLatency.ts

export const computeLatencyMs = (computedAtIso: string, latestCanonicalEventAtIso: string | null): number | null => {
    if (!latestCanonicalEventAtIso) return null;
    const a = Date.parse(computedAtIso);
    const b = Date.parse(latestCanonicalEventAtIso);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
    return a - b;
  };
  
  export const shouldWarnLatency = (latencyMs: number | null, warnAfterSec: number): boolean => {
    if (latencyMs === null) return false;
    return latencyMs > warnAfterSec * 1000;
  };
  