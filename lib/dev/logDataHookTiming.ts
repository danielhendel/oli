// lib/dev/logDataHookTiming.ts
/** Dev-only timing for data hooks. Never logs PII, tokens, or payloads. */

export type DataHookTimingDetail = {
  durationMs?: number;
  userAvailable?: boolean;
  status?: string;
  /** e.g. row/item counts only — never document bodies */
  resultApprox?: string;
};

export function logDataHookTiming(hookName: string, phase: "start" | "end", detail: DataHookTimingDetail): void {
  if (!__DEV__) return;
  // eslint-disable-next-line no-console -- intentional dev diagnostics
  console.log(`[OliDataHook:${hookName}] ${phase}`, detail);
}
