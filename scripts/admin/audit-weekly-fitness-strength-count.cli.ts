#!/usr/bin/env npx tsx
/**
 * Read-only audit: Weekly Fitness strength count vs Strength page reconciliation.
 *
 * Usage (repo root, ADC or GOOGLE_APPLICATION_CREDENTIALS):
 *
 *   npx tsx --tsconfig scripts/tsconfig.json scripts/admin/audit-weekly-fitness-strength-count.cli.ts \
 *     --uid 1Uwhcp4OShV3QLz3VKMHWo5B3033 \
 *     --days 2026-05-31,2026-06-01,2026-06-02,2026-06-03,2026-06-04 \
 *     [--project-id oli-staging-fdbba] \
 *     [--week-anchor 2026-06-02]
 *
 * Does NOT modify Firestore.
 */

import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, type DocumentReference } from "firebase-admin/firestore";

import { countReconciledStrengthTabSessionsForDay } from "../../lib/data/workouts/countReconciledStrengthTabSessionsForDay";
import type { CanonicalWorkoutEventForReconcile } from "../../lib/data/workouts/countReconciledStrengthTabSessionsForDay";
import { computeWorkoutDaySummaryPayload } from "../../lib/data/workouts/workoutDaySummaryCompute";
import { parseWorkoutHistoryItem } from "../../lib/data/workouts/parseWorkoutFromRawEvent";
import { deriveWorkoutDayKey } from "../../lib/data/workouts/workoutsCalendarDayKey";
import { reconcileWorkoutSessionsForDay } from "../../lib/data/workouts/workoutSessionReconciliation";
import {
  deriveOverviewTabSessionCounts,
  sortWorkoutsChronologicalAsc,
} from "../../lib/data/workouts/workoutsCalendarModel";
import { getWeekDaysForAnchor } from "../../lib/ui/calendar/dateUtils";
import type { DayKey } from "../../lib/ui/calendar/types";
import type { RawEventDoc } from "@oli/contracts";

type Args = {
  projectId: string;
  uid: string;
  days: DayKey[];
  weekAnchor: DayKey;
};

function parseArgs(argv: string[]): Args | "help" | "usage" {
  let projectId = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || "oli-staging-fdbba";
  let uid: string | null = null;
  let days: DayKey[] = [];
  let weekAnchor: DayKey | null = null;

  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") return "help";
    if (a === "--project-id") projectId = argv[++i]?.trim() ?? projectId;
    else if (a === "--uid") uid = argv[++i]?.trim() ?? null;
    else if (a === "--days") {
      const raw = argv[++i] ?? "";
      days = raw
        .split(",")
        .map((d) => d.trim())
        .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)) as DayKey[];
    } else if (a === "--week-anchor") weekAnchor = (argv[++i]?.trim() ?? null) as DayKey | null;
  }

  if (!uid || days.length === 0) return "usage";
  if (!weekAnchor) weekAnchor = days[days.length - 1]!;
  return { projectId, uid, days, weekAnchor };
}

function printHelp(): void {
  console.log(`audit-weekly-fitness-strength-count.cli.ts — read-only Weekly Fitness strength audit.

Required:
  --uid <firebaseUid>
  --days <YYYY-MM-DD,YYYY-MM-DD,...>

Optional:
  --project-id <gcpProjectId>   default: oli-staging-fdbba
  --week-anchor <YYYY-MM-DD>    Sun–Sat week containing this day (default: last --days entry)
`);
}

function strengthVolumeLabel(strength: Record<string, unknown> | undefined): string {
  if (!strength) return "—";
  const byUnit = strength.totalVolumeByUnit;
  if (byUnit && typeof byUnit === "object") {
    const o = byUnit as Record<string, number>;
    const parts: string[] = [];
    if (typeof o.lb === "number") parts.push(`${o.lb} lb`);
    if (typeof o.kg === "number") parts.push(`${o.kg} kg`);
    if (parts.length > 0) return parts.join(" + ");
  }
  if (typeof strength.volumeKg === "number") return `${strength.volumeKg} kg`;
  return "—";
}

function pad(s: string, n: number): string {
  return s.length >= n ? s : s + " ".repeat(n - s.length);
}

async function loadRawDocsForUiDay(userRef: DocumentReference, uiDay: DayKey): Promise<RawEventDoc[]> {
  const kinds = ["workout", "strength_workout"] as const;
  const out: RawEventDoc[] = [];
  for (const kind of kinds) {
    const snap = await userRef.collection("rawEvents").where("kind", "==", kind).get();
    for (const doc of snap.docs) {
      const data = doc.data() as RawEventDoc;
      const derived = deriveWorkoutDayKey({
        observedAt: data.observedAt,
        payload: data.payload,
      });
      if (derived === uiDay) out.push({ ...data, id: doc.id });
    }
  }
  return out;
}

async function loadCanonicalWorkoutEvents(
  userRef: DocumentReference,
  day: DayKey,
): Promise<CanonicalWorkoutEventForReconcile[]> {
  const snap = await userRef.collection("events").where("day", "==", day).get();
  const out: CanonicalWorkoutEventForReconcile[] = [];
  for (const doc of snap.docs) {
    const data = doc.data() as Record<string, unknown>;
    const kind = data.kind;
    if (kind === "workout") {
      out.push({
        kind: "workout",
        id: String(data.id ?? doc.id),
        sourceId: String(data.sourceId ?? "unknown"),
        start: String(data.start ?? ""),
        end: String(data.end ?? ""),
        sport: String(data.sport ?? ""),
        durationMinutes: Number(data.durationMinutes ?? 0),
        distanceMeters:
          typeof data.distanceMeters === "number" ? data.distanceMeters : null,
        ...(typeof data.timezone === "string" ? { timezone: data.timezone } : {}),
        ...(typeof data.updatedAt === "string" ? { updatedAt: data.updatedAt } : {}),
      });
    } else if (kind === "strength_workout") {
      const exercises = Array.isArray(data.exercises)
        ? (data.exercises as { exercise?: string }[]).map((x) => ({
            exercise: String(x.exercise ?? ""),
          }))
        : [];
      out.push({
        kind: "strength_workout",
        id: String(data.id ?? doc.id),
        sourceId: String(data.sourceId ?? "unknown"),
        start: String(data.start ?? ""),
        end: String(data.end ?? ""),
        exercises,
      });
    }
  }
  return out;
}

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv);
  if (parsed === "help") {
    printHelp();
    return;
  }
  if (parsed === "usage") {
    printHelp();
    process.exit(1);
  }

  const { projectId, uid, days, weekAnchor } = parsed;

  if (!getApps().length) {
    initializeApp({ projectId });
  }
  const db = getFirestore();
  const userRef = db.collection("users").doc(uid);

  console.log(`\nWeekly Fitness strength audit (read-only)`);
  console.log(`  project: ${projectId}`);
  console.log(`  uid:     ${uid}`);
  console.log(`  days:    ${days.join(", ")}`);
  console.log(`  week:    ${getWeekDaysForAnchor(weekAnchor).join(" → ")} (anchor ${weekAnchor})\n`);

  // Step 1 — stored dailyFacts
  console.log("=== Step 1: stored dailyFacts ===\n");
  const headers = [
    "date",
    "exists",
    "workoutsCount",
    "totalSets",
    "totalVolume",
    "computedAt",
    "meta.computedAt",
    "eventsForDay",
  ];
  const rows: string[][] = [];

  const storedByDay = new Map<DayKey, number | null>();

  for (const day of days) {
    const snap = await userRef.collection("dailyFacts").doc(day).get();
    if (!snap.exists) {
      rows.push([day, "no", "—", "—", "—", "—", "—", "—"]);
      storedByDay.set(day, null);
      continue;
    }
    const data = snap.data() as Record<string, unknown>;
    const strength =
      data.strength && typeof data.strength === "object"
        ? (data.strength as Record<string, unknown>)
        : undefined;
    const wc =
      typeof strength?.workoutsCount === "number" ? strength.workoutsCount : null;
    storedByDay.set(day, wc);
    const meta =
      data.meta && typeof data.meta === "object" ? (data.meta as Record<string, unknown>) : {};
    const source =
      meta.source && typeof meta.source === "object"
        ? (meta.source as Record<string, unknown>)
        : {};
    rows.push([
      day,
      "yes",
      wc != null ? String(wc) : "—",
      typeof strength?.totalSets === "number" ? String(strength.totalSets) : "—",
      strengthVolumeLabel(strength),
      typeof data.computedAt === "string" ? data.computedAt : "—",
      typeof meta.computedAt === "string" ? meta.computedAt : "—",
      typeof source.eventsForDay === "number" ? String(source.eventsForDay) : "—",
    ]);
  }

  const colWidths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map((r) => (r[i] ?? "").length)),
  );
  console.log(headers.map((h, i) => pad(h, colWidths[i]!)).join(" | "));
  console.log(colWidths.map((w) => "-".repeat(w)).join("-+-"));
  for (const r of rows) {
    console.log(r.map((c, i) => pad(c, colWidths[i]!)).join(" | "));
  }

  // Step 2 — Strength page truth (raw → reconcile) + canonical reconcile
  console.log("\n=== Step 2: expected strength-tab session counts ===\n");
  console.log(
    pad("date", 12) +
      " | " +
      pad("rawReconcile", 14) +
      " | " +
      pad("canonicalReconcile", 18) +
      " | " +
      pad("stored", 8) +
      " | " +
      pad("rawRows", 8) +
      " | " +
      pad("canonRows", 10),
  );
  console.log("-".repeat(90));

  let rawWeekSum = 0;
  let canonWeekSum = 0;
  let storedWeekSum = 0;

  const weekDays = getWeekDaysForAnchor(weekAnchor);

  for (const day of days) {
    const rawDocs = await loadRawDocsForUiDay(userRef, day);
    const summary = computeWorkoutDaySummaryPayload(day, rawDocs, new Date().toISOString());
    const rawExpected = summary.strengthSessionCount;

    const canonEvents = await loadCanonicalWorkoutEvents(userRef, day);
    const canonExpected = countReconciledStrengthTabSessionsForDay(day, canonEvents);

    const stored = storedByDay.get(day);
    if (stored != null) storedWeekSum += stored;
    rawWeekSum += rawExpected;
    canonWeekSum += canonExpected;

    console.log(
      pad(day, 12) +
        " | " +
        pad(String(rawExpected), 14) +
        " | " +
        pad(String(canonExpected), 18) +
        " | " +
        pad(stored != null ? String(stored) : "—", 8) +
        " | " +
        pad(String(rawDocs.length), 8) +
        " | " +
        pad(String(canonEvents.length), 10),
    );

    if (rawExpected !== canonExpected || (stored != null && stored !== canonExpected)) {
      const items = sortWorkoutsChronologicalAsc(
        rawDocs
          .filter((d) => d.kind === "workout" || d.kind === "strength_workout")
          .map((d) => parseWorkoutHistoryItem(d)),
      );
      const sessions = reconcileWorkoutSessionsForDay(day, items);
      const tab = deriveOverviewTabSessionCounts(sessions);
      console.log(`    raw sessions: strength=${tab.strengthSessionCount} cardio=${tab.cardioSessionCount} merged=${sessions.length}`);
      for (const s of sessions) {
        if (s.sessionType !== "strength") continue;
        console.log(
          `      • ${s.title} [${s.sessionType}] sources=${s.sourceCount} ids=${s.workouts.map((w) => w.id).join(",")}`,
        );
      }
      console.log(
        `    canonical ids: workout=${canonEvents.filter((e) => e.kind === "workout").map((e) => e.id).join(",") || "—"} strength_workout=${canonEvents.filter((e) => e.kind === "strength_workout").map((e) => e.id).join(",") || "—"}`,
      );
    }
  }

  // Step 4 — Weekly Fitness rollup simulation (full Sun–Sat week)
  console.log("\n=== Step 4: Weekly Fitness rollup (Sun–Sat week from anchor) ===\n");
  let rollupSum = 0;
  for (const day of weekDays) {
    const snap = await userRef.collection("dailyFacts").doc(day).get();
    let count = 0;
    let status = "missing";
    if (snap.exists) {
      const data = snap.data() as Record<string, unknown>;
      const strength = data.strength as Record<string, unknown> | undefined;
      const wc = strength?.workoutsCount;
      if (typeof wc === "number" && Number.isFinite(wc) && wc > 0) {
        count = wc;
        status = "ready";
      } else {
        status = "ready-zero";
      }
    }
    rollupSum += count;
    console.log(`  ${day} = ${count}  (${status})`);
  }
  console.log(`\n  weekly total (rollup sum) = ${rollupSum}`);
  console.log(`  sum inspected days stored   = ${storedWeekSum}`);
  console.log(`  sum inspected days raw exp  = ${rawWeekSum}`);
  console.log(`  sum inspected days canon exp = ${canonWeekSum}`);

  // Step 3 — local code path confirmation
  console.log("\n=== Step 3: recompute code path (local source) ===\n");
  console.log(
    "  aggregateDailyFacts.buildStrengthFacts uses countReconciledStrengthTabSessionsForDay (not raw row sum).",
  );
  console.log("  recomputeDailyFactsAdminHttp → aggregateDailyFactsForDay → buildStrengthFacts.");
  console.log("  recomputeForDay (canonical trigger) uses the same aggregateDailyFactsForDay.");
  console.log(
    "\n  Deploy verification: compare meta.computedAt above to your recompute time; if counts still match old formula, deployed bundle may be stale.",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
