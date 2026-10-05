/**
 * §23.11 temporal schedule catalog (BCV-016) — S-01 … S-15.
 * asOf = 2026-10-04T12:00:00.000Z; DAY_MS = 86_400_000. Timestamps are exact.
 * Base subject: P-01 demographics/indices; only measuredAt / sourceEventId vary.
 */

import { AS_OF_MS, DAY_MS } from "./constants";
import type { BundleSpec } from "./scoringBundle";

export type Schedule = {
  id: string;
  definition: string;
  /** Offsets BEFORE asOf in ms (0 = asOf). */
  waistOffsetMs: number;
  heightOffsetMs: number;
  dxaOffsetMs: number;
  dxaScanRef: string | null;
  waistSourceEventId: string | null;
  dxaSourceEventId: string | null;
};

const d = (n: number) => n * DAY_MS;

type S = Partial<Schedule> & Pick<Schedule, "id" | "definition">;

function sched(s: S): Schedule {
  return {
    waistOffsetMs: 0,
    heightOffsetMs: 0,
    dxaOffsetMs: 0,
    dxaScanRef: "scan_1",
    waistSourceEventId: null,
    dxaSourceEventId: null,
    ...s,
  };
}

export const SCHEDULES: readonly Schedule[] = [
  sched({ id: "S-01", definition: "Same-day all constructs" }),
  sched({ id: "S-02", definition: "30d separation: H1=asOf; DXA=asOf-30d", dxaOffsetMs: d(30) }),
  sched({ id: "S-03", definition: "89d separation: H1=asOf; DXA=asOf-89d", dxaOffsetMs: d(89) }),
  sched({ id: "S-04", definition: "90d separation: H1=asOf; DXA=asOf-90d", dxaOffsetMs: d(90) }),
  sched({ id: "S-05", definition: "90d + 1ms: H1=asOf; DXA=asOf-(90d+1ms)", dxaOffsetMs: d(90) + 1 }),
  sched({ id: "S-06", definition: "91d: H1=asOf; DXA=asOf-91d", dxaOffsetMs: d(91) }),
  sched({ id: "S-07", definition: "one input age 179d: Waist=asOf-179d, others asOf", waistOffsetMs: d(179) }),
  sched({ id: "S-08", definition: "180d: Waist=asOf-180d, others asOf", waistOffsetMs: d(180) }),
  sched({ id: "S-09", definition: "180d + 1ms: Waist=asOf-(180d+1ms), others asOf", waistOffsetMs: d(180) + 1 }),
  sched({ id: "S-10", definition: "H1 fresh + DXA old: H1=asOf; DXA=asOf-120d", dxaOffsetMs: d(120) }),
  sched({
    id: "S-11",
    definition: "DXA fresh + H1 old: DXA=asOf; H1(Waist+Height)=asOf-120d",
    waistOffsetMs: d(120),
    heightOffsetMs: d(120),
  }),
  sched({
    id: "S-12",
    definition: "rolling monthly waist + semiannual DXA: Waist=Height=asOf-30d; DXA=asOf-180d",
    waistOffsetMs: d(30),
    heightOffsetMs: d(30),
    dxaOffsetMs: d(180),
  }),
  sched({
    id: "S-13",
    definition: "annual DXA + monthly waist: Waist=Height=asOf-30d; DXA=asOf-365d",
    waistOffsetMs: d(30),
    heightOffsetMs: d(30),
    dxaOffsetMs: d(365),
  }),
  sched({
    id: "S-14",
    definition: "same sourceEventId scan constructs: DXA share sourceEventId scan-A at asOf-10d; Waist=asOf-10d different event",
    waistOffsetMs: d(10),
    heightOffsetMs: d(10),
    dxaOffsetMs: d(10),
    dxaScanRef: "scan-A",
    dxaSourceEventId: "scan-A",
    waistSourceEventId: "waist-event-S14",
  }),
  sched({
    id: "S-15",
    definition: "same timestamp, different sourceEventId: all asOf-10d; Waist event w1, DXA scan-B (gap not forced 0)",
    waistOffsetMs: d(10),
    heightOffsetMs: d(10),
    dxaOffsetMs: d(10),
    dxaScanRef: "scan-B",
    dxaSourceEventId: "scan-B",
    waistSourceEventId: "w1",
  }),
];

export function scheduleById(id: string): Schedule {
  const s = SCHEDULES.find((x) => x.id === id);
  if (!s) throw new Error(`schedule_not_found:${id}`);
  return s;
}

export function isoAt(offsetMs: number): string {
  return new Date(AS_OF_MS - offsetMs).toISOString();
}

export function scheduleTimestamps(s: Schedule): { waistAt: string; heightAt: string; dxaAt: string } {
  return { waistAt: isoAt(s.waistOffsetMs), heightAt: isoAt(s.heightOffsetMs), dxaAt: isoAt(s.dxaOffsetMs) };
}

/** Apply a schedule's timestamps / event ids to a P-01 BundleSpec. */
export function applySchedule(spec: BundleSpec, s: Schedule): BundleSpec {
  const t = scheduleTimestamps(s);
  return {
    ...spec,
    waistAt: t.waistAt,
    heightAt: t.heightAt,
    dxaAt: t.dxaAt,
    dxaScanRef: s.dxaScanRef,
    waistSourceEventRef: s.waistSourceEventId,
    dxaSourceEventRef: s.dxaSourceEventId,
  };
}

export const MAX_INPUT_AGE_MS = 180 * DAY_MS;
export const MAX_ERA_GAP_MS = 90 * DAY_MS;

/**
 * Independent oracle for the freeze rules (§3.5 / §6 / §4.8) used to cross-check the engine:
 *   Health inputs  = {WHtR(=Waist time), Waist, Height, DXA-index time}
 *   Perf inputs    = {DXA-index time}
 *   too old  : any input age  > 180d (strictly greater)
 *   era gap  : max − min of input times > 90d (strictly greater)
 */
export function expectedEligibility(s: Schedule): {
  health: { eligible: boolean; reason: "evidence_too_old" | "evidence_era_mismatch" | null };
  performance: { eligible: boolean; reason: "evidence_too_old" | "evidence_era_mismatch" | null };
} {
  const hTimes = [s.waistOffsetMs, s.heightOffsetMs, s.dxaOffsetMs];
  const hOld = hTimes.some((o) => o > MAX_INPUT_AGE_MS);
  const hGap = Math.max(...hTimes) - Math.min(...hTimes);
  const health = hOld
    ? { eligible: false, reason: "evidence_too_old" as const }
    : hGap > MAX_ERA_GAP_MS
      ? { eligible: false, reason: "evidence_era_mismatch" as const }
      : { eligible: true, reason: null };
  const performance =
    s.dxaOffsetMs > MAX_INPUT_AGE_MS
      ? { eligible: false, reason: "evidence_too_old" as const }
      : { eligible: true, reason: null };
  return { health, performance };
}
