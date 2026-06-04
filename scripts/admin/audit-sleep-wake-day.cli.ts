#!/usr/bin/env npx tsx
/**
 * Read-only audit: Oura sleep → sleepNights → sleep-night resolution for wake-day bugs.
 *
 * Usage:
 *   npx tsx --tsconfig scripts/tsconfig.json scripts/admin/audit-sleep-wake-day.cli.ts \
 *     --project-id oli-staging-fdbba --uid <uid> \
 *     --days 2026-06-02,2026-06-03,2026-06-04
 */

import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

import { localCalendarDayKeyFromIsoInTimeZone } from "@oli/contracts";
import { sleepNightDocumentSchema } from "@oli/contracts/sleepNight";

import { mapOuraSleepToIngestItem } from "../../services/api/src/lib/ouraApi";
import { buildSleepNightFromOuraSleepDocument } from "../../services/api/src/lib/oura/buildSleepNightFromOuraDocument";
import {
  resolveOuraSleepIngestBase,
  type OuraSleepWindowDocument,
} from "../../services/api/src/lib/oura/resolveOuraSleepIngestBase";
import type { SleepNightDocumentDto, SleepNightViewDto } from "@oli/contracts/sleepNight";
import { coerceRawSleepNightForRead } from "../../services/api/src/lib/sleepNightReadCoerce";

function pickLatestCompleteSleepNight(nights: SleepNightDocumentDto[]): SleepNightDocumentDto | null {
  const complete = nights.filter((n) => n.isComplete);
  if (complete.length === 0) return null;
  complete.sort((a, b) => {
    const endA = a.endedAt ?? "";
    const endB = b.endedAt ?? "";
    if (endA !== endB) return endA.localeCompare(endB);
    return a.anchorDay.localeCompare(b.anchorDay);
  });
  return complete[complete.length - 1] ?? null;
}

/** Same rules as services/api/src/lib/sleepNightRead.ts resolveSleepNightViewFromBoundedReads */
function resolveSleepNightViewFromBoundedReads(
  requestedDay: string,
  exact: SleepNightDocumentDto | null,
  minus1: SleepNightDocumentDto | null,
  minus2: SleepNightDocumentDto | null,
): SleepNightViewDto | null {
  const priorAnchors = [minus1, minus2].filter((n): n is SleepNightDocumentDto => n != null);

  if (exact?.isComplete === true) {
    return {
      requestedDay,
      anchorDay: exact.anchorDay,
      wakeDay: exact.wakeDay,
      resolution: "exact_anchor",
      isFallback: false,
      sleepNight: exact,
    };
  }

  const wakeMatches = priorAnchors.filter((n) => n.isComplete && n.wakeDay === requestedDay);
  const bestWake = pickLatestCompleteSleepNight(wakeMatches);
  if (bestWake != null) {
    return {
      requestedDay,
      anchorDay: bestWake.anchorDay,
      wakeDay: bestWake.wakeDay,
      resolution: "wake_day",
      isFallback: false,
      sleepNight: bestWake,
    };
  }

  const bestPrior = pickLatestCompleteSleepNight(priorAnchors);
  if (bestPrior != null) {
    return {
      requestedDay,
      anchorDay: bestPrior.anchorDay,
      wakeDay: bestPrior.wakeDay,
      resolution: "latest_completed_prior_night",
      isFallback: false,
      sleepNight: bestPrior,
    };
  }

  return null;
}

type Args = { projectId: string; uid: string; days: string[] };

function parseArgs(argv: string[]): Args | "help" | "usage" {
  let projectId = process.env.GCLOUD_PROJECT || "oli-staging-fdbba";
  let uid: string | null = null;
  let days: string[] = [];
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") return "help";
    if (a === "--project-id") projectId = argv[++i]?.trim() ?? projectId;
    else if (a === "--uid") uid = argv[++i]?.trim() ?? null;
    else if (a === "--days") {
      days = (argv[++i] ?? "")
        .split(",")
        .map((d) => d.trim())
        .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));
    }
  }
  if (!uid || days.length === 0) return "usage";
  return { projectId, uid, days };
}

function printHelp(): void {
  console.log(`audit-sleep-wake-day.cli.ts — read-only sleep wake-day / merge audit.

Required:
  --uid <firebaseUid>
  --days <YYYY-MM-DD,YYYY-MM-DD,...>

Optional:
  --project-id <gcpProjectId>
`);
}

function dayMinus(ymd: string, days: number): string {
  const d = new Date(ymd + "T12:00:00.000Z");
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function pad(s: string, n: number): string {
  return s.length >= n ? s : s + " ".repeat(n - s.length);
}

function serialize(v: unknown): unknown {
  if (v instanceof Timestamp) return v.toDate().toISOString();
  return v;
}

function vendorDocFromSnap(data: Record<string, unknown>, docId: string): OuraSleepWindowDocument {
  const payload =
    data.payload != null && typeof data.payload === "object" && !Array.isArray(data.payload)
      ? (data.payload as Record<string, unknown>)
      : {};
  return {
    ...payload,
    ...data,
    id: String(data.id ?? payload.id ?? docId),
    day: typeof data.day === "string" ? data.day : (payload.day as string | undefined),
  } as OuraSleepWindowDocument;
}

type CandidateRow = {
  vendorId: string;
  ouraDay: string | null;
  type: string | null;
  totalSleepSec: number | null;
  totalSleepMinutes: number | null;
  score: number | null;
  isMainSleepIngest: boolean;
  bedtimeStart: string | null;
  bedtimeEnd: string | null;
  anchorDay: string | null;
  wakeDayUtc: string | null;
  wouldWriteSleepNight: boolean;
};

function rankCandidates(rows: CandidateRow[]): CandidateRow[] {
  return [...rows].sort((a, b) => {
    const aMain = a.isMainSleepIngest ? 1 : 0;
    const bMain = b.isMainSleepIngest ? 1 : 0;
    if (aMain !== bMain) return bMain - aMain;
    const aMin = a.totalSleepMinutes ?? 0;
    const bMin = b.totalSleepMinutes ?? 0;
    if (aMin !== bMin) return bMin - aMin;
    const aScore = a.score ?? 0;
    const bScore = b.score ?? 0;
    return bScore - aScore;
  });
}

function parseSleepNightDoc(
  data: Record<string, unknown> | undefined,
  docId: string,
): ReturnType<typeof sleepNightDocumentSchema.safeParse>["data"] | null {
  if (!data) return null;
  const merged = coerceRawSleepNightForRead(data, docId);
  const parsed = sleepNightDocumentSchema.safeParse(merged);
  return parsed.success ? parsed.data : null;
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

  const { projectId, uid, days } = parsed;
  if (!getApps().length) initializeApp({ projectId });
  const db = getFirestore();
  const userRef = db.collection("users").doc(uid);

  console.log(`\nSleep wake-day audit (read-only)`);
  console.log(`  project: ${projectId}`);
  console.log(`  uid:     ${uid}`);
  console.log(`  days:    ${days.join(", ")}\n`);

  // Load all vendor sleep in extended window (anchor days ±1).
  const windowLo = dayMinus(days[0]!, 1);
  const windowHi = dayMinus(days[days.length - 1]!, -1);
  const vendorSnap = await userRef.collection("ouraVendorSleep").get();
  const allVendor: { id: string; data: Record<string, unknown> }[] = [];
  for (const doc of vendorSnap.docs) {
    const data = doc.data() as Record<string, unknown>;
    const dayField = typeof data.day === "string" ? data.day : null;
    if (dayField && dayField >= windowLo && dayField <= windowHi) {
      allVendor.push({ id: doc.id, data });
    }
  }

  for (const requestedDay of days) {
    console.log(`\n${"=".repeat(72)}`);
    console.log(`REQUESTED CALENDAR DAY: ${requestedDay}`);
    console.log("=".repeat(72));

    const exactSnap = await userRef.collection("sleepNights").doc(requestedDay).get();
    const m1 = await userRef.collection("sleepNights").doc(dayMinus(requestedDay, 1)).get();
    const m2 = await userRef.collection("sleepNights").doc(dayMinus(requestedDay, 2)).get();

    const exact = parseSleepNightDoc(exactSnap.data() as Record<string, unknown> | undefined, requestedDay);
    const minus1 = parseSleepNightDoc(m1.data() as Record<string, unknown> | undefined, dayMinus(requestedDay, 1));
    const minus2 = parseSleepNightDoc(m2.data() as Record<string, unknown> | undefined, dayMinus(requestedDay, 2));

    const view = resolveSleepNightViewFromBoundedReads(requestedDay, exact, minus1, minus2);

    console.log("\n--- stored sleepNights/{requestedDay} ---");
    if (!exactSnap.exists) {
      console.log("(no document)");
    } else {
      console.log(JSON.stringify(serialize(exactSnap.data()), null, 2));
    }

    console.log("\n--- sleep-night resolution (production read path) ---");
    if (!view) {
      console.log("(no complete night resolved)");
    } else {
      const night = view.sleepNight;
      const minutes = night.mainSleepMinutes ?? night.totalSleepMinutes ?? null;
      console.log(
        JSON.stringify(
          {
            requestedDay: view.requestedDay,
            resolution: view.resolution,
            anchorDay: view.anchorDay,
            wakeDay: view.wakeDay,
            sourceDocumentId: night.sourceDocumentId,
            totalSleepMinutes: night.totalSleepMinutes,
            mainSleepMinutes: night.mainSleepMinutes,
            score: night.score,
            startedAt: night.startedAt,
            endedAt: night.endedAt,
            uiMinutes: minutes,
          },
          null,
          2,
        ),
      );
    }

    const factsSnap = await userRef.collection("dailyFacts").doc(requestedDay).get();
    console.log("\n--- dailyFacts.sleep ---");
    if (!factsSnap.exists) {
      console.log("(no document)");
    } else {
      const f = factsSnap.data() as Record<string, unknown>;
      console.log(JSON.stringify(serialize(f.sleep), null, 2));
    }

    const eventsSnap = await userRef.collection("events").where("day", "==", requestedDay).get();
    const sleepEvents = eventsSnap.docs
      .filter((d) => (d.data() as { kind?: string }).kind === "sleep")
      .map((d) => {
        const e = d.data() as Record<string, unknown>;
        return {
          id: d.id,
          day: e.day,
          start: e.start,
          end: e.end,
          totalMinutes: e.totalMinutes,
          isMainSleep: e.isMainSleep,
          efficiency: e.efficiency,
        };
      });
    console.log("\n--- canonical sleep events (day == requestedDay) ---");
    console.log(JSON.stringify(sleepEvents, null, 2));

    const candidates: CandidateRow[] = [];
    for (const { id, data } of allVendor) {
      const doc = vendorDocFromSnap(data, id);
      const ouraDay = typeof doc.day === "string" ? doc.day : null;
      if (ouraDay !== requestedDay) continue;

      const resolved = resolveOuraSleepIngestBase(doc);
      const built = buildSleepNightFromOuraSleepDocument(doc, { sourceDocumentId: id });
      const ingest = mapOuraSleepToIngestItem(doc);
      const end = resolved?.end ?? null;
      const wakeDayUtc =
        end != null ? localCalendarDayKeyFromIsoInTimeZone(end, "UTC") : null;
      const totalSec =
        typeof doc.total_sleep_duration === "number" ? doc.total_sleep_duration : null;

      candidates.push({
        vendorId: id,
        ouraDay,
        type: typeof doc.type === "string" ? doc.type : null,
        totalSleepSec: totalSec,
        totalSleepMinutes: built?.merge?.totalSleepMinutes as number | null ?? null,
        score:
          typeof doc.score === "number"
            ? doc.score
            : typeof (doc as { composite_score?: number }).composite_score === "number"
              ? (doc as { composite_score: number }).composite_score
              : null,
        isMainSleepIngest: ingest?.isMainSleep === true,
        bedtimeStart:
          (typeof doc.bedtime_start === "string" ? doc.bedtime_start : null) ??
          (typeof doc.bed_time === "string" ? doc.bed_time : null),
        bedtimeEnd:
          (typeof doc.bedtime_end === "string" ? doc.bedtime_end : null) ??
          (typeof doc.wake_time === "string" ? doc.wake_time : null),
        anchorDay: built?.anchorDay ?? null,
        wakeDayUtc,
        wouldWriteSleepNight: built != null,
      });
    }

    const ranked = rankCandidates(candidates);
    const storedRaw = exactSnap.data() as Record<string, unknown> | undefined;
    const storedSourceId =
      exact?.sourceDocumentId ??
      (typeof storedRaw?.sourceDocumentId === "string" ? storedRaw.sourceDocumentId : null);
    const lastMergeWinner = candidates[candidates.length - 1]?.vendorId ?? null;

    console.log("\n--- Oura vendor candidates (ouraVendorSleep.day == requestedDay) ---");
    const headers = [
      "vendorId",
      "type",
      "totalMin",
      "score",
      "main?",
      "bedtime_start",
      "bedtime_end",
      "anchor",
      "wakeUtc",
    ];
    const rows = ranked.map((c) => [
      c.vendorId.slice(0, 8) + "…",
      c.type ?? "—",
      c.totalSleepMinutes != null ? String(c.totalSleepMinutes) : "—",
      c.score != null ? String(c.score) : "—",
      c.isMainSleepIngest ? "yes" : "no",
      (c.bedtimeStart ?? "—").slice(0, 22),
      (c.bedtimeEnd ?? "—").slice(0, 22),
      c.anchorDay ?? "—",
      c.wakeDayUtc ?? "—",
    ]);
    const widths = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => (r[i] ?? "").length)));
    console.log(headers.map((h, i) => pad(h, widths[i]!)).join(" | "));
    console.log(widths.map((w) => "-".repeat(w)).join("-+-"));
    for (const r of rows) {
      console.log(r.map((c, i) => pad(c, widths[i]!)).join(" | "));
    }

    const best = ranked[0];
    console.log("\n--- selection analysis ---");
    console.log(
      JSON.stringify(
        {
          candidateCount: candidates.length,
          storedSourceDocumentId: storedSourceId,
          lastIngestOrderWouldWinMerge: lastMergeWinner,
          bestByDurationAndType: best?.vendorId ?? null,
          bestMinutes: best?.totalSleepMinutes ?? null,
          storedMinutes: exact?.totalSleepMinutes ?? null,
          verdict:
            storedSourceId && best && storedSourceId !== best.vendorId
              ? "STORED_MISMATCH: sleepNights doc does not match best Oura candidate (merge last-write-wins bug)"
              : storedSourceId && best && storedSourceId === best.vendorId
                ? "STORED_MATCHES_BEST"
                : "INCONCLUSIVE",
        },
        null,
        2,
      ),
    );

    for (const c of ranked) {
      const reason =
        c.vendorId === storedSourceId
          ? "SELECTED_BY_OLI (matches sleepNights.sourceDocumentId)"
          : c.vendorId === best?.vendorId
            ? "SHOULD_WIN (longest / long_sleep)"
            : "REJECTED (shorter or non-main; lost merge race)";
      console.log(`  [CANDIDATE] ${c.vendorId}: ${reason}`);
    }
  }

  console.log("\n--- pipeline note ---");
  console.log(
    "sleepNights/{anchorDay} is written with Firestore merge:true per Oura period sharing the same Oura `day`.",
  );
  console.log(
    "Last processed period overwrites duration/times on the anchor doc — short naps can clobber long_sleep.",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
