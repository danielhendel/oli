#!/usr/bin/env node
/**
 * Inspect the steps freshness chain for one user/day.
 * Prints rawEvent payload, canonical steps event, dailyFacts.activity.steps,
 * dailyFacts.energy.factors.steps, and computedAt timestamps so you can pinpoint
 * which step in the rawEvent → canonical → dailyFacts → energy chain is stale.
 *
 * Usage (repo root, ADC or GOOGLE_APPLICATION_CREDENTIALS for target project):
 *
 *   node scripts/admin/inspect-steps-dailyfacts.mjs --uid 1Uwhcp4OShV3QLz3VKMHWo5B3033 --day 2026-05-07
 *
 * Optional:
 *   --project-id YOUR_GCP_PROJECT   (default: oli-staging-fdbba)
 *   --raw-doc-id CUSTOM_ID          if idempotency key is not appleHealth:v2:steps:{day}
 *
 * Verdict: identifies the first divergence in
 *   {rawEvent.payload.steps, canonical.steps, dailyFacts.activity.steps, dailyFacts.energy.factors.steps}
 * so the operator can attribute staleness to ingest, normalization, recompute, or energy compute.
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

function pickKeys(obj, keys) {
  if (!obj || typeof obj !== "object") return null;
  const out = {};
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) out[k] = obj[k];
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help || !args.uid || !args.day) {
    console.error(
      "Usage: node scripts/admin/inspect-steps-dailyfacts.mjs --uid <firebaseUid> --day YYYY-MM-DD [--project-id ID] [--raw-doc-id id]",
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
  const facts = factsSnap.exists ? factsSnap.data() : null;

  const rawSummary = raw
    ? {
        path: rawRef.path,
        kind: raw.kind,
        provider: raw.provider,
        sourceId: raw.sourceId,
        observedAt: raw.observedAt,
        receivedAt: raw.receivedAt,
        payload: pickKeys(raw.payload, ["day", "start", "end", "timezone", "steps", "distanceKm"]),
      }
    : null;

  const canonicalSummary = canonical
    ? {
        path: canonicalRef.path,
        kind: canonical.kind,
        day: canonical.day,
        steps: canonical.steps,
        sourceId: canonical.sourceId,
        sourceSampleId: canonical.sourceSampleId ?? null,
        createdAt: canonical.createdAt,
        updatedAt: canonical.updatedAt,
        timezone: canonical.timezone,
      }
    : null;

  const energy = facts && typeof facts === "object" ? facts.energy : null;
  const factors = energy && typeof energy === "object" ? energy.factors : null;
  const stepsFactor = factors && typeof factors === "object" ? factors.steps : null;

  const factsSummary = facts
    ? {
        path: factsRef.path,
        date: facts.date,
        computedAt: facts.computedAt,
        activitySteps: facts.activity?.steps ?? null,
        activityDistanceKm: facts.activity?.distanceKm ?? null,
        energy: energy
          ? {
              modelVersion: energy.modelVersion,
              computedAt: energy.computedAt,
              estimatedKcal: energy.estimatedKcal,
              factors: {
                steps: stepsFactor
                  ? {
                      kcalLow: stepsFactor.kcalLow,
                      kcalHigh: stepsFactor.kcalHigh,
                      confidence: stepsFactor.confidence,
                      inputsUsed: stepsFactor.inputsUsed,
                      inputsMissing: stepsFactor.inputsMissing,
                    }
                  : null,
              },
            }
          : null,
        energyInfluencers: facts.energyInfluencers
          ? {
              movement: facts.energyInfluencers.movement ?? null,
            }
          : null,
      }
    : null;

  /** Map the chain to numeric steps (or null) so we can pinpoint divergence. */
  const round = (n) => (typeof n === "number" && Number.isFinite(n) ? Math.round(n) : null);
  const stepsChain = {
    rawPayloadSteps:
      raw && raw.payload && typeof raw.payload.steps === "number" ? raw.payload.steps : null,
    canonicalSteps: canonical && typeof canonical.steps === "number" ? canonical.steps : null,
    /** dailyFacts.activity.steps is rounded by `resolvedStepsTotalFromContributing`; comparisons
     * against rawEvent/canonical use the rounded form so floating HK totals don't trip the audit. */
    dailyFactsActivitySteps: facts?.activity?.steps ?? null,
    /** energy.factors.steps does not store the raw count — it stores kcal. The presence of the
     * factor + reasonable kcalLow vs activitySteps × 0.04 confirms compute saw the same number. */
    energyStepsFactorPresent: stepsFactor != null,
  };

  const rawSteps = round(stepsChain.rawPayloadSteps);
  const canonSteps = round(stepsChain.canonicalSteps);
  const factsSteps = round(stepsChain.dailyFactsActivitySteps);

  let firstDivergence = null;
  if (stepsChain.rawPayloadSteps == null) {
    firstDivergence = "rawEvent.payload.steps missing — ingest never wrote a steps payload for this day";
  } else if (stepsChain.canonicalSteps == null) {
    firstDivergence =
      "canonical.steps missing — normalization (onRawEventCreated/onRawEventUpdatedForNormalization) did not produce a steps canonical event";
  } else if (canonSteps !== rawSteps) {
    firstDivergence = `canonical.steps (${stepsChain.canonicalSteps}) != raw.payload.steps (${stepsChain.rawPayloadSteps}) — normalization stale or merged with older canonical`;
  } else if (stepsChain.dailyFactsActivitySteps == null) {
    firstDivergence =
      "dailyFacts.activity.steps missing — recomputeDerivedTruthForDay did not run after canonical write";
  } else if (factsSteps !== canonSteps) {
    firstDivergence = `dailyFacts.activity.steps (${stepsChain.dailyFactsActivitySteps}) != canonical.steps (${stepsChain.canonicalSteps}) — recompute did not pick up the latest canonical`;
  } else if (!stepsChain.energyStepsFactorPresent) {
    firstDivergence =
      "energy.factors.steps missing — recompute persisted activity.steps but did not run computeDailyEnergyV1";
  } else {
    firstDivergence = "chain is consistent — UI reads dailyFacts directly; if NEAT is still stale, suspect client cache";
  }

  console.log(
    JSON.stringify(
      {
        uid: args.uid,
        day: args.day,
        expectedRawDocId: expectedRawId,
        stepsChain,
        firstDivergence,
        raw: rawSummary,
        canonical: canonicalSummary,
        dailyFacts: factsSummary,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
