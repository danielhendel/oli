#!/usr/bin/env node
/**
 * One-day Activity steps allocation audit: workouts raw → canonical → dailyFacts.
 *
 * Usage:
 *   node scripts/admin/audit-activity-steps-allocation-day.mjs --uid UID --day YYYY-MM-DD
 */

import { createRequire } from "module";

const require = createRequire(import.meta.url);
const admin = require("firebase-admin");

// Mirror lib/shared/workoutClassification.ts (audit-only; keep in sync)
function normalizeWorkoutSportKey(sport) {
  return sport.trim().toLowerCase().replace(/[\s_-]+/g, "");
}
const STRENGTH_KEYS = new Set([
  "traditionalstrengthtraining", "functionalstrengthtraining", "coretraining",
  "strengthtraining", "resistancetraining", "weighttraining", "weightlifting",
  "powerlifting", "bodybuilding", "calisthenics",
]);
const CARDIO_KEYS = new Set([
  "running", "walking", "cycling", "handcycling", "swimming", "rowing", "elliptical",
  "highintensityintervaltraining", "hiit", "stairclimbing", "stairs", "steptraining",
  "hiking", "dance", "socialdance", "cardiodance", "mixedcardio", "mixedmetaboliccardiotraining",
  "boxing", "kickboxing", "martialarts", "jumprope",
]);
function classifyWorkoutSportForDailyFactsRollup(sport) {
  const key = normalizeWorkoutSportKey(sport);
  if (!key) return "exclude";
  if (STRENGTH_KEYS.has(key)) return "strength";
  if (CARDIO_KEYS.has(key)) return "cardio";
  return "exclude";
}

function deriveWorkoutLocalDay(raw) {
  const payload = raw.payload;
  const start = typeof payload?.start === "string" ? payload.start : null;
  const timezone =
    typeof payload?.timezone === "string"
      ? payload.timezone
      : typeof raw.timeZone === "string"
        ? raw.timeZone
        : null;
  if (!start || !timezone) return null;
  // Use Intl for local day (America/New_York etc.)
  try {
    const d = new Date(start);
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(d);
    const y = parts.find((p) => p.type === "year")?.value;
    const m = parts.find((p) => p.type === "month")?.value;
    const day = parts.find((p) => p.type === "day")?.value;
    if (y && m && day) return `${y}-${m}-${day}`;
  } catch {
    return null;
  }
  return null;
}

function parseArgs(argv) {
  const out = {
    uid: null,
    day: null,
    projectId: process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || "oli-staging-fdbba",
    help: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") out.help = true;
    else if (a === "--uid") out.uid = argv[++i] ?? null;
    else if (a === "--day") out.day = argv[++i] ?? null;
    else if (a === "--project-id") out.projectId = argv[++i] ?? out.projectId;
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help || !args.uid || !args.day) {
    console.error(
      "Usage: node scripts/admin/audit-activity-steps-allocation-day.mjs --uid <uid> --day YYYY-MM-DD",
    );
    process.exit(args.help ? 0 : 1);
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: args.projectId,
    });
  }
  const db = admin.firestore();
  const { uid, day } = args;

  const factsRef = db.doc(`users/${uid}/dailyFacts/${day}`);
  const factsSnap = await factsRef.get();
  const dailyFacts = factsSnap.exists ? factsSnap.data() : null;

  const [rawWorkoutSnap, rawStrengthSnap, eventsSnap] = await Promise.all([
    db.collection(`users/${uid}/rawEvents`).where("kind", "==", "workout").get(),
    db.collection(`users/${uid}/rawEvents`).where("kind", "==", "strength_workout").get(),
    db.collection(`users/${uid}/events`).where("day", "==", day).get(),
  ]);

  const rawToday = [];
  for (const doc of [...rawWorkoutSnap.docs, ...rawStrengthSnap.docs]) {
    const data = doc.data();
    const localDay = deriveWorkoutLocalDay(data);
    if (localDay !== day) continue;
    const p = data.payload || {};
    const sport = typeof p.sport === "string" ? p.sport : null;
    const klass = sport ? classifyWorkoutSportForDailyFactsRollup(sport) : "exclude";
    rawToday.push({
      rawEventId: doc.id,
      kind: data.kind,
      provider: data.provider,
      sourceId: data.sourceId,
      observedAt: data.observedAt,
      receivedAt: data.receivedAt,
      localDay,
      payload: {
        start: p.start ?? null,
        end: p.end ?? null,
        timezone: p.timezone ?? data.timeZone ?? null,
        sport,
        displayName: p.displayName ?? null,
        steps: p.steps ?? null,
        hasStepsKey: Object.prototype.hasOwnProperty.call(p, "steps"),
        hk: p.hk ?? null,
        sync: p.sync ?? null,
      },
      classification: klass,
      includedInStepsAllocation: data.kind === "workout" && (klass === "cardio" || klass === "strength"),
      exclusionReason:
        data.kind === "strength_workout"
          ? "strength_workout kind excluded by buildActivityStepsAllocationV1 (only kind=workout)"
          : klass === "exclude"
            ? `sport "${sport}" not in cardio/strength allowlists`
            : null,
    });
  }

  const canonicalWorkouts = [];
  const canonicalSteps = [];
  for (const doc of eventsSnap.docs) {
    const e = doc.data();
    if (e.kind === "steps") {
      canonicalSteps.push({ id: doc.id, steps: e.steps, day: e.day });
    }
    if (e.kind === "workout" || e.kind === "strength_workout") {
      const sport = typeof e.sport === "string" ? e.sport : null;
      const klass = sport ? classifyWorkoutSportForDailyFactsRollup(sport) : "exclude";
      canonicalWorkouts.push({
        canonicalId: doc.id,
        kind: e.kind,
        day: e.day,
        sport,
        start: e.start,
        end: e.end,
        steps: e.steps ?? null,
        hasStepsKey: Object.prototype.hasOwnProperty.call(e, "steps"),
        classification: klass,
        includedInStepsAllocation: e.kind === "workout" && (klass === "cardio" || klass === "strength"),
        exclusionReason:
          e.kind === "strength_workout"
            ? "strength_workout canonical excluded"
            : klass === "exclude"
              ? `sport "${sport}" excluded`
              : typeof e.steps !== "number"
                ? "canonical.steps missing (immutable — recompute cannot add)"
                : null,
      });
    }
  }

  const classifiedWithSteps = canonicalWorkouts.filter(
    (w) =>
      w.kind === "workout" &&
      (w.classification === "cardio" || w.classification === "strength") &&
      typeof w.steps === "number" &&
      Number.isFinite(w.steps),
  );

  let failClosedReason = null;
  const totalSteps = dailyFacts?.activity?.steps;
  if (typeof totalSteps !== "number" || !Number.isFinite(totalSteps) || totalSteps < 0) {
    failClosedReason = "missing activity.steps";
  } else {
    const classified = canonicalWorkouts.filter(
      (w) => w.kind === "workout" && (w.classification === "cardio" || w.classification === "strength"),
    );
    if (classified.length > 0 && classifiedWithSteps.length === 0) {
      failClosedReason = "classified workouts exist but none have canonical.steps";
    }
  }

  console.log(
    JSON.stringify(
      {
        uid,
        day,
        projectId: args.projectId,
        dailyFacts: {
          exists: factsSnap.exists,
          activitySteps: dailyFacts?.activity?.steps ?? null,
          stepsAllocation: dailyFacts?.activity?.stepsAllocation ?? null,
          computedAt: dailyFacts?.computedAt ?? null,
        },
        canonicalStepsForDay: canonicalSteps,
        rawWorkoutsForDay: rawToday,
        canonicalWorkoutsForDay: canonicalWorkouts,
        analysis: {
          failClosedReasonIfNoAllocation: failClosedReason,
          classifiedWorkoutCanonicals: canonicalWorkouts.filter(
            (w) => w.kind === "workout" && (w.classification === "cardio" || w.classification === "strength"),
          ).length,
          classifiedWithStepsCount: classifiedWithSteps.length,
          sumClassifiedSteps: classifiedWithSteps.reduce((s, w) => s + Math.round(w.steps), 0),
          wouldExceedTotal:
            typeof totalSteps === "number" &&
            classifiedWithSteps.reduce((s, w) => s + Math.round(w.steps), 0) > Math.round(totalSteps),
        },
        counts: {
          rawWorkoutsToday: rawToday.length,
          rawWithSteps: rawToday.filter((r) => typeof r.payload.steps === "number").length,
          rawStrengthWorkoutToday: rawToday.filter((r) => r.kind === "strength_workout").length,
          rawAppleWorkoutToday: rawToday.filter((r) => r.kind === "workout").length,
          canonicalWorkoutsToday: canonicalWorkouts.length,
        },
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
