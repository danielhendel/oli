// lib/data/readiness.ts

export const isFreshComputedAt = (args: {
  computedAtIso: string | null | undefined;
  latestEventAtIso: string | null | undefined;
}): boolean => {
  const c = args.computedAtIso ?? null;
  const e = args.latestEventAtIso ?? null;
  if (!c) return false;
  if (!e) return true; // no events → computedAt presence is enough (UI also checks eventsCount)
  const cMs = Date.parse(c);
  const eMs = Date.parse(e);
  if (Number.isNaN(cMs) || Number.isNaN(eMs)) return false;
  return cMs >= eMs;
};

export const isCompatiblePipelineVersion = (args: {
  pipelineVersion: number | null | undefined;
  expectedPipelineVersion: number;
}): boolean => {
  const pv = args.pipelineVersion ?? null;
  if (!pv) return false; // ✅ conservative: no meta = not ready
  return pv === args.expectedPipelineVersion;
};
