// lib/data/replaySession.ts
export type ReplaySelection =
  | { mode: "latest" }
  | { mode: "run"; runId: string }
  | { mode: "asOf"; asOf: string }; // ISO datetime string

export const replaySelectionLatest = (): ReplaySelection => ({ mode: "latest" });
export const replaySelectionRun = (runId: string): ReplaySelection => ({ mode: "run", runId });
export const replaySelectionAsOf = (asOf: string): ReplaySelection => ({ mode: "asOf", asOf });

export function isReplayEnabled(sel: ReplaySelection): boolean {
  return sel.mode !== "latest";
}
