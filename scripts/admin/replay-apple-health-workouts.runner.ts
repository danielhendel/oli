/**
 * Replay normalization for existing apple_health workout rawEvents (same pipeline as onRawEventCreated).
 *
 * Run via: node scripts/admin/replay-apple-health-workouts.mjs [--userId …] [--day YYYY-MM-DD] [--dry-run] [--skip-recompute]
 *
 * Requires Application Default Credentials (or GOOGLE_APPLICATION_CREDENTIALS) for the target Firebase project.
 */

import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { db } from "../../services/functions/src/firebaseAdmin";
import { processRawEventForNormalization } from "../../services/functions/src/normalization/processRawEventForNormalization";
import { localCalendarDayKeyFromIsoInTimeZone } from "../../lib/contracts/localCalendarDayKey";

const DEFAULT_USER_ID = "1Uwhcp4OShV3QLz3VKMHWo5B3033";
const DEFAULT_DAY = "2026-05-05";

function parseArgs(argv: string[]): {
  userId: string;
  day: string;
  dryRun: boolean;
  skipRecompute: boolean;
  help: boolean;
} {
  let userId = DEFAULT_USER_ID;
  let day = DEFAULT_DAY;
  let dryRun = false;
  let skipRecompute = false;
  let help = false;
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--help" || a === "-h") help = true;
    else if (a === "--dry-run") dryRun = true;
    else if (a === "--skip-recompute") skipRecompute = true;
    else if (a === "--userId") userId = argv[++i] ?? userId;
    else if (a === "--day") day = argv[++i] ?? day;
  }
  return { userId, day, dryRun, skipRecompute, help };
}

function deriveWorkoutLocalDay(rawData: Record<string, unknown>): string | null {
  const payload = rawData.payload as Record<string, unknown> | undefined;
  const start = typeof payload?.start === "string" ? payload.start : null;
  const timezone =
    typeof payload?.timezone === "string"
      ? payload.timezone
      : typeof rawData.timeZone === "string"
        ? rawData.timeZone
        : null;
  if (!start || !timezone) return null;
  return localCalendarDayKeyFromIsoInTimeZone(start, timezone);
}

async function postRecomputeDailyFacts(args: { url: string; userId: string; date: string }): Promise<{ ok: boolean; status: number; body: string }> {
  const { execFileSync } = await import("node:child_process");
  const firebaseToken = process.env.FIREBASE_TOKEN?.trim();
  if (!firebaseToken) {
    throw new Error("Missing FIREBASE_TOKEN for admin recompute POST");
  }
  let googleIdentityToken = process.env.GOOGLE_IDENTITY_TOKEN?.trim();
  if (!googleIdentityToken) {
    googleIdentityToken = execFileSync("gcloud", ["auth", "print-identity-token"], { encoding: "utf-8" }).trim();
  }
  const base = args.url.replace(/\/$/, "");
  const target = `${base}/`;
  const res = await fetch(target, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${firebaseToken}`,
      "X-Serverless-Authorization": `Bearer ${googleIdentityToken}`,
    },
    body: JSON.stringify({ userId: args.userId, date: args.date }),
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, body: text };
}

async function main(): Promise<void> {
  const rawArgv = process.argv.slice(2);
  const opts = parseArgs(rawArgv);
  if (opts.help) {
    // eslint-disable-next-line no-console
    console.log(`
Usage:
  node scripts/admin/replay-apple-health-workouts.mjs [options]

Options:
  --userId <uid>     Default: ${DEFAULT_USER_ID}
  --day <YYYY-MM-DD> Default: ${DEFAULT_DAY}
  --dry-run          List matching raw event ids only; no writes
  --skip-recompute   Do not POST recomputeDailyFactsAdminHttp after replays

Environment:
  GOOGLE_APPLICATION_CREDENTIALS or gcloud application-default credentials (Firestore)
  FIREBASE_TOKEN               Firebase ID token with admin claim (for recompute POST)
  GOOGLE_IDENTITY_TOKEN        Optional; otherwise gcloud auth print-identity-token
  RECOMPUTE_DAILY_FACTS_URL      Cloud Run URL for recomputeDailyFactsAdminHttp (unless --skip-recompute)
`);
    process.exit(0);
  }

  const { userId, day: targetDay } = opts;

  const rawCol = db.collection("users").doc(userId).collection("rawEvents");
  /** Prefer single-field query + in-memory provider filter to avoid composite index requirements. */
  const snap = await rawCol.where("kind", "==", "workout").get();

  const matching: QueryDocumentSnapshot[] = [];
  for (const doc of snap.docs) {
    const data = doc.data() as Record<string, unknown>;
    if (data.provider !== "apple_health") continue;
    const localDay = deriveWorkoutLocalDay(data);
    if (localDay !== targetDay) continue;
    matching.push(doc);
  }

  const stats = {
    found: matching.length,
    processed: 0,
    canonicalCreated: 0,
    skippedAlreadyExists: 0,
    failed: 0,
  };

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify({
      level: "info",
      msg: "replay_apple_health_workouts_start",
      userId,
      targetDay,
      queryWorkoutRows: snap.docs.length,
      foundMatchingDay: stats.found,
      dryRun: opts.dryRun,
    }),
  );

  if (opts.dryRun) {
    for (const doc of matching) {
      // eslint-disable-next-line no-console
      console.log(JSON.stringify({ level: "info", msg: "would_replay", rawEventId: doc.id, path: doc.ref.path }));
    }
    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify({
        msg: "summary",
        totalFound: stats.found,
        processed: 0,
        canonicalCreated: 0,
        skippedAlreadyExists: 0,
        failures: 0,
      }),
    );
    process.exit(0);
  }

  for (const doc of matching) {
    const rawEventId = doc.id;
    const eventsRef = db.collection("users").doc(userId).collection("events").doc(rawEventId);

    try {
      const existingCanon = await eventsRef.get();
      if (existingCanon.exists) {
        stats.skippedAlreadyExists += 1;
        // eslint-disable-next-line no-console
        console.log(
          JSON.stringify({
            level: "info",
            msg: "replay_skipped_canonical_exists",
            rawEventId,
            canonicalPath: eventsRef.path,
          }),
        );
        continue;
      }

      const fresh = await doc.ref.get();
      if (!fresh.exists) {
        stats.failed += 1;
        // eslint-disable-next-line no-console
        console.log(JSON.stringify({ level: "error", msg: "replay_raw_missing", rawEventId }));
        continue;
      }

      stats.processed += 1;
      await processRawEventForNormalization({
        snapshot: fresh,
        pathUserId: userId,
        rawEventId,
        trigger: "create",
      });

      const after = await eventsRef.get();
      if (after.exists) {
        stats.canonicalCreated += 1;
      } else {
        stats.failed += 1;
      }

      // eslint-disable-next-line no-console
      console.log(
        JSON.stringify({
          level: "info",
          msg: "replay_normalized",
          rawEventId,
          canonicalNowExists: after.exists,
        }),
      );
    } catch (err) {
      stats.failed += 1;
      // eslint-disable-next-line no-console
      console.log(
        JSON.stringify({
          level: "error",
          msg: "replay_failed",
          rawEventId,
          error: err instanceof Error ? err.message : String(err),
        }),
      );
    }
  }

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify({
      msg: "summary",
      totalFound: stats.found,
      processed: stats.processed,
      canonicalCreated: stats.canonicalCreated,
      skippedAlreadyExists: stats.skippedAlreadyExists,
      failures: stats.failed,
    }),
  );

  if (!opts.skipRecompute) {
    const url = process.env.RECOMPUTE_DAILY_FACTS_URL?.trim();
    if (!url) {
      // eslint-disable-next-line no-console
      console.log(
        JSON.stringify({
          level: "warn",
          msg: "recompute_skipped_missing_url",
          hint: "Set RECOMPUTE_DAILY_FACTS_URL or pass --skip-recompute",
        }),
      );
    } else {
      try {
        const res = await postRecomputeDailyFacts({ url, userId, date: targetDay });
        // eslint-disable-next-line no-console
        console.log(
          JSON.stringify({
            level: res.ok ? "info" : "error",
            msg: "recompute_daily_facts_done",
            status: res.status,
            bodyPreview: res.body.slice(0, 500),
          }),
        );
        if (!res.ok) process.exitCode = 1;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.log(
          JSON.stringify({
            level: "error",
            msg: "recompute_daily_facts_failed",
            error: err instanceof Error ? err.message : String(err),
          }),
        );
        process.exitCode = 1;
      }
    }
  }

  if (stats.failed > 0) process.exitCode = 1;
}

void main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
