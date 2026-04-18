#!/usr/bin/env node
/**
 * Targeted one-day Apple Health steps re-ingest via POST /ingest (same body shape as
 * {@link ../../lib/integrations/appleHealth/appleHealthStepsIngestBody.ts buildAppleHealthStepsIngestBody}).
 *
 * Local calendar window [start, end] for the given day + IANA timezone matches
 * {@link ../../lib/events/manualNutrition.ts localNutritionDayWindowIsoUtc} (UTC ISO instants).
 *
 * Idempotency / rawEvents doc id (must match {@link ../../lib/integrations/appleHealth/idempotency.ts stepsIdempotencyKey}):
 *   appleHealth:v2:steps:<YYYY-MM-DD>
 *
 * Usage (repo root) — timezone MUST be copied from the user’s existing Apple steps raw doc
 * (`payload.timezone` / top-level ingest contract), not guessed:
 *
 *   export BACKEND_BASE_URL='https://…'   # same host pattern as app (e.g. *.uc.gateway.dev)
 *   export GATEWAY_API_KEY='…'            # required when BACKEND_BASE_URL is API Gateway
 *   export FIREBASE_ID_TOKEN='…'          # ID token for user 1Uwh… (that user must sign in)
 *
 *   node scripts/admin/reingest-apple-steps-day.mjs \
 *     --day 2026-04-14 \
 *     --steps 15285 \
 *     --timezone America/New_York
 *
 *   # Print payload only (no network):
 *   node scripts/admin/reingest-apple-steps-day.mjs --dry-run --day 2026-04-14 --steps 15285 --timezone America/New_York
 *
 * After a successful ingest, rerun admin recompute for adjacent days (existing script):
 *   node scripts/admin/recompute-steps-ytd.mjs --userId <uid> --startDate 2026-04-13 --endDate 2026-04-15
 */

import process from "node:process";

/** @param {string} dayKey @param {number} deltaDays */
function addCalendarDaysToDayKey(dayKey, deltaDays) {
  const d = new Date(`${dayKey}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

/** @param {number} ms @param {string} timeZone */
function ymdInTimeZone(ms, timeZone) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ms));
}

/**
 * First UTC instant where the user's local calendar reads `dayKey` in `timeZone`.
 * (Aligned with lib/events/manualNutrition.ts `utcInstantForLocalCalendarDayStart`.)
 * @param {string} dayKey
 * @param {string} timeZone
 */
function utcInstantForLocalCalendarDayStart(dayKey, timeZone) {
  const parts = dayKey.split("-");
  const y = Number(parts[0]);
  const mo = Number(parts[1]);
  const da = Number(parts[2]);
  if (!y || !mo || !da) throw new Error(`Invalid dayKey: ${dayKey}`);

  const fmt = (ms) => ymdInTimeZone(ms, timeZone);

  let found = null;
  for (let h = -48; h <= 48; h += 1) {
    const cand = Date.UTC(y, mo - 1, da, 12 + h, 0, 0, 0);
    if (fmt(cand) === dayKey) {
      found = cand;
      break;
    }
  }
  if (found == null) {
    throw new Error(`Could not resolve local calendar day ${dayKey} in ${timeZone}`);
  }

  let start = found;
  const coarse = 60_000;
  for (let i = 0; i < 2000; i += 1) {
    const prev = start - coarse;
    if (fmt(prev) !== dayKey) break;
    start = prev;
  }
  while (start > 0 && fmt(start - 1) === dayKey) start -= 1;
  return start;
}

/** @param {string} dayKey @param {string} timeZone */
function localDayWindowIsoUtc(dayKey, timeZone) {
  const startMs = utcInstantForLocalCalendarDayStart(dayKey, timeZone);
  const nextDay = addCalendarDaysToDayKey(dayKey, 1);
  const nextStartMs = utcInstantForLocalCalendarDayStart(nextDay, timeZone);
  const endMs = nextStartMs - 1;
  return {
    start: new Date(startMs).toISOString(),
    end: new Date(endMs).toISOString(),
  };
}

/**
 * Same return shape as lib/integrations/appleHealth/appleHealthStepsIngestBody.ts
 * @param {{ start: string; end: string; day: string; timezone: string; steps: number }} params
 */
function buildAppleHealthStepsIngestBody(params) {
  const { start, end, day, timezone, steps } = params;
  return {
    provider: "apple_health",
    sourceId: "apple_health",
    kind: "steps",
    observedAt: start,
    timeZone: timezone,
    payload: {
      start,
      end,
      timezone,
      day,
      steps,
      sync: { mode: "range", anchorVersion: 1, anchorUsed: false },
    },
  };
}

/** @param {string} iso @param {string} ianaTimeZone */
function localCalendarDayKeyFromIsoInTimeZone(iso, ianaTimeZone) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: ianaTimeZone }).format(d);
  } catch {
    return null;
  }
}

function stepsIdempotencyKey(day) {
  const safe = String(day).replace(/\//g, "_").trim();
  if (!safe) throw new Error("stepsIdempotencyKey: day is required");
  return `appleHealth:v2:steps:${safe}`;
}

function isGatewayBaseUrl(base) {
  try {
    return new URL(base).hostname.endsWith(".uc.gateway.dev");
  } catch {
    return false;
  }
}

function parseArgs(argv) {
  const out = {
    day: null,
    steps: null,
    timezone: null,
    dryRun: false,
    help: false,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--help" || a === "-h") out.help = true;
    else if (a === "--day") out.day = argv[++i] ?? null;
    else if (a === "--steps") out.steps = argv[++i] != null ? Number(argv[i]) : NaN;
    else if (a === "--timezone") out.timezone = argv[++i] ?? null;
    else if (a === "--dry-run") out.dryRun = true;
  }
  return out;
}

function printUsage() {
  console.error(`
Usage:
  export BACKEND_BASE_URL='https://…'
  export GATEWAY_API_KEY='…'    # if using *.uc.gateway.dev
  export FIREBASE_ID_TOKEN='…'  # signed-in as the target user

  node scripts/admin/reingest-apple-steps-day.mjs \\
    --day YYYY-MM-DD \\
    --steps <number> \\
    --timezone <IANA>     # REQUIRED: from existing raw payload / app integration, do not guess

  --dry-run   Print JSON body + idempotency key only (no POST)
`);
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printUsage();
    process.exit(0);
  }

  if (!args.day || !/^\d{4}-\d{2}-\d{2}$/.test(args.day)) {
    console.error(JSON.stringify({ level: "error", msg: "invalid_or_missing_day", day: args.day }));
    printUsage();
    process.exit(1);
  }
  if (!Number.isFinite(args.steps) || args.steps < 0) {
    console.error(JSON.stringify({ level: "error", msg: "invalid_or_missing_steps", steps: args.steps }));
    process.exit(1);
  }
  if (!args.timezone || typeof args.timezone !== "string" || !args.timezone.trim()) {
    console.error(
      JSON.stringify({
        level: "error",
        msg: "missing_timezone",
        hint: "Pass --timezone from Firestore users/{uid}/rawEvents/appleHealth:v2:steps:… payload.timezone (same as top-level timeZone for ingest).",
      }),
    );
    process.exit(1);
  }

  const tz = args.timezone.trim();
  const { start, end } = localDayWindowIsoUtc(args.day, tz);
  const body = buildAppleHealthStepsIngestBody({
    start,
    end,
    day: args.day,
    timezone: tz,
    steps: Math.round(args.steps),
  });

  const derivedDay = localCalendarDayKeyFromIsoInTimeZone(body.payload.start, body.payload.timezone);
  if (derivedDay !== args.day) {
    console.error(
      JSON.stringify({
        level: "error",
        msg: "day_key_mismatch_after_build",
        expectedDay: args.day,
        derivedDayFromPayloadStartTz: derivedDay,
        payloadStart: body.payload.start,
        payloadTimezone: body.payload.timezone,
      }),
    );
    process.exit(1);
  }

  const idempotencyKey = stepsIdempotencyKey(args.day);

  const meta = {
    level: "info",
    msg: "reingest_apple_steps_day_prepared",
    idempotencyKey,
    idempotencyKeyMatchesRepo: idempotencyKey === `appleHealth:v2:steps:${args.day}`,
    payloadShape: "buildAppleHealthStepsIngestBody (see lib/integrations/appleHealth/appleHealthStepsIngestBody.ts)",
    sampleIdentityFields: "none in builder (repo truth: optional sourceSampleId not set by this path)",
    body,
  };
  console.log(JSON.stringify(meta, null, 2));

  if (args.dryRun) {
    console.log(JSON.stringify({ level: "info", msg: "dry_run_no_post" }));
    process.exit(0);
  }

  const base = (process.env.BACKEND_BASE_URL ?? "").trim().replace(/\/+$/, "");
  const token = (process.env.FIREBASE_ID_TOKEN ?? "").trim();
  if (!base || !token) {
    console.error(JSON.stringify({ level: "error", msg: "missing_BACKEND_BASE_URL_or_FIREBASE_ID_TOKEN" }));
    process.exit(1);
  }

  let url = `${base}/ingest`;
  if (isGatewayBaseUrl(base)) {
    const apiKey = (process.env.GATEWAY_API_KEY ?? "").trim();
    if (!apiKey) {
      console.error(JSON.stringify({ level: "error", msg: "missing_GATEWAY_API_KEY_for_gateway_host" }));
      process.exit(1);
    }
    const u = new URL(url);
    u.searchParams.set("key", apiKey);
    url = u.toString();
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { _parseError: true, rawBody: text.slice(0, 2000) };
  }

  console.log(
    JSON.stringify(
      {
        level: res.ok ? "info" : "error",
        msg: "ingest_response",
        httpStatus: res.status,
        json,
      },
      null,
      2,
    ),
  );

  process.exit(res.ok && res.status >= 200 && res.status < 300 ? 0 : 1);
}

main().catch((err) => {
  console.error(JSON.stringify({ level: "error", msg: "fatal", error: String(err) }));
  process.exit(1);
});
