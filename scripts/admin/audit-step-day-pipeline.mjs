#!/usr/bin/env node
/**
 * One-day pipeline audit: Apple Health steps raw → canonical → dailyFacts.
 *
 * Usage (repo root, ADC or GOOGLE_APPLICATION_CREDENTIALS for target project):
 *
 *   node scripts/admin/audit-step-day-pipeline.mjs --uid YOUR_UID --day 2026-04-07
 *
 * Optional:
 *   --project-id YOUR_GCP_PROJECT   (default: oli-staging-fdbba, same as other scripts)
 *   --raw-doc-id CUSTOM_ID          if idempotency key is not appleHealth:v2:steps:{day}
 *
 * Prints: raw fields, canonical doc (same id as raw by design), dailyFacts doc,
 * and a verdict: scenarios 1–4 from the operator checklist.
 */

import { createRequire } from "module";

const require = createRequire(import.meta.url);
const admin = require("firebase-admin");

function parseArgs(argv) {
  const out = {
    uid: null,
    day: null,
    projectId: process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || "oli-staging-fdbba",
    rawDocId: null,
    help: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") out.help = true;
    else if (a === "--uid") out.uid = argv[++i] ?? null;
    else if (a === "--day") out.day = argv[++i] ?? null;
    else if (a === "--project-id") out.projectId = argv[++i] ?? out.projectId;
    else if (a === "--raw-doc-id") out.rawDocId = argv[++i] ?? null;
  }
  return out;
}

function pick(d, keys) {
  const o = {};
  for (const k of keys) {
    if (d && Object.prototype.hasOwnProperty.call(d, k)) o[k] = d[k];
  }
  return o;
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help || !args.uid || !args.day) {
    console.error(
      "Usage: node scripts/admin/audit-step-day-pipeline.mjs --uid <firebaseUid> --day YYYY-MM-DD [--project-id ID] [--raw-doc-id id]",
    );
    process.exit(args.help ? 0 : 1);
  }

  const dayRe = /^\d{4}-\d{2}-\d{2}$/;
  if (!dayRe.test(args.day)) {
    console.error("Invalid --day (expected YYYY-MM-DD)");
    process.exit(1);
  }

  const expectedRawId = args.rawDocId || `appleHealth:v2:steps:${args.day}`;

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: args.projectId,
    });
  }
  const db = admin.firestore();

  return (async () => {
    const rawRef = db.doc(`users/${args.uid}/rawEvents/${expectedRawId}`);
    const canonicalRef = db.doc(`users/${args.uid}/events/${expectedRawId}`);
    const factsRef = db.doc(`users/${args.uid}/dailyFacts/${args.day}`);

    const [rawSnap, canonicalSnap, factsSnap] = await Promise.all([
      rawRef.get(),
      canonicalRef.get(),
      factsRef.get(),
    ]);

    const raw = rawSnap.exists ? rawSnap.data() : null;
    const canonical = canonicalSnap.exists ? canonicalSnap.data() : null;
    const dailyFacts = factsSnap.exists ? factsSnap.data() : null;

    const rawSummary = raw
      ? {
          path: rawRef.path,
          kind: raw.kind,
          provider: raw.provider,
          sourceId: raw.sourceId,
          observedAt: raw.observedAt,
          receivedAt: raw.receivedAt,
          payload: raw.payload
            ? pick(raw.payload, ["day", "start", "end", "timezone", "steps"])
            : null,
        }
      : null;

    const canonicalSummary = canonical
      ? {
          path: canonicalRef.path,
          kind: canonical.kind,
          day: canonical.day,
          steps: canonical.steps,
          createdAt: canonical.createdAt,
          updatedAt: canonical.updatedAt,
          start: canonical.start,
          end: canonical.end,
          timezone: canonical.timezone,
        }
      : null;

    const factsSummary = dailyFacts
      ? {
          path: factsRef.path,
          date: dailyFacts.date,
          activitySteps: dailyFacts.activity?.steps,
          hasActivity: dailyFacts.activity != null,
        }
      : null;

    const isAppleStepsRaw =
      raw &&
      raw.kind === "steps" &&
      raw.provider === "apple_health" &&
      (raw.sourceId === "apple_health" || raw.sourceId === "healthkit");

    const payloadDay = raw?.payload && typeof raw.payload.day === "string" ? raw.payload.day : null;

    let scenario = null;
    let divergence = null;

    if (!raw) {
      scenario = "0";
      divergence = `No raw doc at ${rawRef.path} (expected idempotency id). If ingest used another key, pass --raw-doc-id.`;
    } else if (!isAppleStepsRaw) {
      scenario = "0b";
      divergence =
        "Raw doc exists but is not apple_health steps (check provider/sourceId/kind). Normalization path may differ.";
    } else if (!canonical) {
      scenario = "1";
      divergence =
        "Raw Apple Health steps exists; no canonical at events/{sameId}. First failure: normalization did not persist canonical (mapper failure, trigger not run, or different canonical id — unlikely for steps).";
    } else if (canonical.day !== args.day) {
      scenario = "2";
      divergence = `Canonical exists but day="${canonical.day}" !== queried day "${args.day}". First failure: day mapping (payload.start + payload.timezone vs local calendar day used in id / UI).`;
    } else if (!dailyFacts) {
      scenario = "3";
      divergence =
        "Canonical exists with correct day but dailyFacts doc missing. First failure: recomputeDerivedTruthForDay not run or failed after canonical write (e.g. old Functions without identical_noop recompute + only replay updates).";
    } else {
      scenario = "4";
      divergence =
        "dailyFacts exists for this day. If API still 404s, mismatch is elsewhere (wrong uid, wrong project, or caching). If UI empty, check activity.steps and zero-step aggregation.";
    }

    console.log(
      JSON.stringify(
        {
          uid: args.uid,
          queriedDay: args.day,
          expectedRawDocId: expectedRawId,
          scenario,
          verdict: {
            "1_raw_no_canonical": scenario === "1",
            "2_canonical_wrong_day": scenario === "2",
            "3_no_dailyFacts": scenario === "3",
            "4_facts_exist_api_ui_elsewhere": scenario === "4",
          },
          firstDivergencePoint: divergence,
          raw: rawSummary,
          canonical: canonicalSummary,
          dailyFacts: factsSummary,
        },
        null,
        2,
      ),
    );
  })();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
