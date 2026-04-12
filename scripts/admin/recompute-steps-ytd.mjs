#!/usr/bin/env node
/**
 * Sequential dailyFacts recompute for a date range (e.g. YTD) for one user.
 *
 * Calls ONLY `recomputeDailyFactsAdminHttp` (POST). That handler overwrites
 * `users/{userId}/dailyFacts/{date}` from existing canonical events + raw body
 * loaders — it does NOT mutate `rawEvents` or `events`.
 *
 * Usage (repo root):
 *
 *   export FIREBASE_TOKEN='<Firebase ID token with admin: true claim>'
 *   export RECOMPUTE_DAILY_FACTS_URL='https://recomputedailyfactsadminhttp-XXXX-uc.a.run.app'
 *   node scripts/admin/recompute-steps-ytd.mjs \
 *     --userId <firebaseUid> \
 *     --startDate 2026-01-01 \
 *     --endDate 2026-04-07
 *
 * Optional:
 *   --url <url>     overrides RECOMPUTE_DAILY_FACTS_URL
 *   GOOGLE_IDENTITY_TOKEN   if set, used instead of `gcloud auth print-identity-token`
 *
 * Resume after failure: fix the issue, then rerun with `--startDate` set to the
 * failed day (or the next day if that day succeeded).
 *
 * Auth headers (private Gen2 Cloud Run + Firebase admin):
 *   - X-Serverless-Authorization: Bearer <Google identity token> (invoker)
 *   - Authorization: Bearer <Firebase ID token> (requireAdmin)
 *
 * Requires: `gcloud` on PATH and authenticated (unless GOOGLE_IDENTITY_TOKEN is set).
 */

import { execFileSync } from "node:child_process";
import process from "node:process";

/** @param {string} label */
function logInfo(label, payload = {}) {
  const line = { level: "info", ts: new Date().toISOString(), msg: label, ...payload };
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(line));
}

/** @param {string} label */
function logError(label, payload = {}) {
  const line = { level: "error", ts: new Date().toISOString(), msg: label, ...payload };
  // eslint-disable-next-line no-console
  console.error(JSON.stringify(line));
}

function printUsage() {
  // eslint-disable-next-line no-console
  console.error(`
Usage:
  export FIREBASE_TOKEN='...'
  export RECOMPUTE_DAILY_FACTS_URL='https://...run.app'
  node scripts/admin/recompute-steps-ytd.mjs \\
    --userId <uid> \\
    --startDate YYYY-MM-DD \\
    --endDate YYYY-MM-DD

Options:
  --url <url>   Override RECOMPUTE_DAILY_FACTS_URL
`);
}

function parseArgs(argv) {
  const out = {
    userId: null,
    startDate: null,
    endDate: null,
    url: process.env.RECOMPUTE_DAILY_FACTS_URL?.trim() || null,
    help: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") out.help = true;
    else if (a === "--userId") out.userId = argv[++i] ?? null;
    else if (a === "--startDate") out.startDate = argv[++i] ?? null;
    else if (a === "--endDate") out.endDate = argv[++i] ?? null;
    else if (a === "--url") out.url = argv[++i]?.trim() ?? null;
  }
  return out;
}

/** @param {string} name @param {string | null} value */
function assertYmd(name, value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${name} must be YYYY-MM-DD (got ${JSON.stringify(value)})`);
  }
}

/** @param {string} ymd */
function parseYmdUtc(ymd) {
  const [y, m, d] = ymd.split("-").map((x) => parseInt(x, 10));
  if (!y || !m || !d) throw new Error(`Invalid date: ${ymd}`);
  return new Date(Date.UTC(y, m - 1, d));
}

/** @param {Date} d */
function formatYmdUtc(d) {
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
  const da = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${mo}-${da}`;
}

/**
 * Inclusive UTC calendar days from startYmd through endYmd.
 * @param {string} startYmd
 * @param {string} endYmd
 * @returns {string[]}
 */
function enumerateDatesInclusive(startYmd, endYmd) {
  const start = parseYmdUtc(startYmd);
  const end = parseYmdUtc(endYmd);
  if (start.getTime() > end.getTime()) {
    throw new Error(`startDate ${startYmd} must be <= endDate ${endYmd}`);
  }
  const out = [];
  for (let t = start.getTime(); t <= end.getTime(); t += 24 * 60 * 60 * 1000) {
    out.push(formatYmdUtc(new Date(t)));
  }
  return out;
}

function readGoogleIdentityToken() {
  const fromEnv = process.env.GOOGLE_IDENTITY_TOKEN?.trim();
  if (fromEnv) {
    logInfo("identity_token_source", { source: "GOOGLE_IDENTITY_TOKEN" });
    return fromEnv;
  }
  try {
    const token = execFileSync("gcloud", ["auth", "print-identity-token"], {
      encoding: "utf-8",
    }).trim();
    if (!token) throw new Error("empty token from gcloud");
    logInfo("identity_token_source", { source: "gcloud_auth_print_identity_token" });
    return token;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Failed to obtain Google identity token (set GOOGLE_IDENTITY_TOKEN or run gcloud auth login): ${message}`,
    );
  }
}

/**
 * @param {object} opts
 * @param {string} opts.url
 * @param {string} opts.userId
 * @param {string} opts.date
 * @param {string} opts.firebaseToken
 * @param {string} opts.googleIdentityToken
 */
async function postRecompute({ url, userId, date, firebaseToken, googleIdentityToken }) {
  const base = url.replace(/\/$/, "");
  const target = `${base}/`;

  const body = JSON.stringify({ userId, date });

  const res = await fetch(target, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${firebaseToken}`,
      "X-Serverless-Authorization": `Bearer ${googleIdentityToken}`,
    },
    body,
  });

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { _parseError: true, rawBody: text.slice(0, 2000) };
  }

  return { status: res.status, ok: res.ok, json, text };
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printUsage();
    process.exit(0);
  }

  assertYmd("startDate", args.startDate);
  assertYmd("endDate", args.endDate);

  if (!args.userId?.trim()) {
    logError("config_error", { error: "Missing --userId" });
    printUsage();
    process.exit(1);
  }

  if (!args.url) {
    logError("config_error", {
      error: "Missing RECOMPUTE_DAILY_FACTS_URL or --url",
    });
    printUsage();
    process.exit(1);
  }

  const firebaseToken = process.env.FIREBASE_TOKEN?.trim();
  if (!firebaseToken) {
    logError("config_error", { error: "Missing env FIREBASE_TOKEN" });
    printUsage();
    process.exit(1);
  }

  const dates = enumerateDatesInclusive(args.startDate, args.endDate);
  logInfo("run_start", {
    userId: args.userId.trim(),
    startDate: args.startDate,
    endDate: args.endDate,
    dayCount: dates.length,
    urlHost: (() => {
      try {
        return new URL(args.url).host;
      } catch {
        return "(invalid-url)";
      }
    })(),
  });

  let googleIdentityToken = readGoogleIdentityToken();

  for (let i = 0; i < dates.length; i++) {
    const date = dates[i];
    const dayIndex = i + 1;

    logInfo("day_start", { date, dayIndex, of: dates.length });

    let result;
    try {
      result = await postRecompute({
        url: args.url,
        userId: args.userId.trim(),
        date,
        firebaseToken,
        googleIdentityToken,
      });
    } catch (err) {
      const stack = err instanceof Error ? err.stack : undefined;
      const message = err instanceof Error ? err.message : String(err);
      logError("day_fetch_failed", { date, dayIndex, error: message, stack });
      process.exit(1);
    }

    if (result.status === 401 || result.status === 403) {
      logInfo("auth_retry_refresh_identity_token", { date, status: result.status });
      try {
        googleIdentityToken = readGoogleIdentityToken();
        result = await postRecompute({
          url: args.url,
          userId: args.userId.trim(),
          date,
          firebaseToken,
          googleIdentityToken,
        });
      } catch (err) {
        const stack = err instanceof Error ? err.stack : undefined;
        const message = err instanceof Error ? err.message : String(err);
        logError("day_fetch_failed_after_token_refresh", { date, dayIndex, error: message, stack });
        process.exit(1);
      }
    }

    if (!result.ok || (result.json && result.json.ok === false)) {
      logError("day_recompute_failed", {
        date,
        dayIndex,
        httpStatus: result.status,
        responseBody: result.json ?? result.text.slice(0, 4000),
      });
      process.exit(1);
    }

    logInfo("day_ok", {
      date,
      dayIndex,
      httpStatus: result.status,
      response: result.json,
    });
  }

  logInfo("run_complete", {
    userId: args.userId.trim(),
    startDate: args.startDate,
    endDate: args.endDate,
    daysProcessed: dates.length,
  });
}

main().catch((err) => {
  const stack = err instanceof Error ? err.stack : undefined;
  const message = err instanceof Error ? err.message : String(err);
  logError("fatal", { error: message, stack });
  process.exit(1);
});
