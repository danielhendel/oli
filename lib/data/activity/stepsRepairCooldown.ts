/** Minimum time between automatic sync/gap-driven repairs (connection may bypass). */
export const STEPS_REPAIR_AUTO_COOLDOWN_MS = 5 * 60 * 1000;

export function stepsRepairCooldownAllowsRun(params: {
  lastCompletedAtIso: string | null;
  nowMs: number;
  bypassCooldown: boolean;
  cooldownMs?: number;
}): boolean {
  if (params.bypassCooldown) return true;
  const ms = params.cooldownMs ?? STEPS_REPAIR_AUTO_COOLDOWN_MS;
  if (!params.lastCompletedAtIso) return true;
  const t = Date.parse(params.lastCompletedAtIso);
  if (Number.isNaN(t)) return true;
  return params.nowMs - t >= ms;
}
