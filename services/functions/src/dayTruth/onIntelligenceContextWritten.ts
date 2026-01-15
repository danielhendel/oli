import { onDocumentWritten } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";

import { db } from "../firebaseAdmin";
import type { IsoDateTimeString, YmdDateString } from "../types/health";
import { dayTruthDocSchema } from "@oli/contracts";

const safeRevisionId = (computedAt: string): string =>
  computedAt.replace(/[^\w-]/g, "_"); // safe for Firestore doc id

export const onIntelligenceContextWritten = onDocumentWritten(
  {
    document: "users/{userId}/intelligenceContext/{dateId}",
    region: "us-central1",
    serviceAccount: "oli-functions-runtime@oli-staging-fdbba.iam.gserviceaccount.com",
  },
  async (event) => {
    const after = event.data?.after;
    if (!after?.exists) return;

    const userId = event.params.userId as string;
    const dateId = event.params.dateId as YmdDateString;

    const intelligence = after.data() as { computedAt?: IsoDateTimeString; meta?: unknown } | undefined;
    const intelligenceComputedAt = intelligence?.computedAt ?? new Date().toISOString();

    const userRef = db.collection("users").doc(userId);

    // Pull DailyFacts for anchors (best-effort; DayTruth still must exist even if missing)
    const dailyFactsSnap = await userRef.collection("dailyFacts").doc(dateId).get();
    const dailyFacts = dailyFactsSnap.exists
      ? (dailyFactsSnap.data() as { computedAt?: IsoDateTimeString } | undefined)
      : undefined;

    // Best-effort anchors from intelligence meta/source (if present)
    const latestCanonicalEventAt =
      typeof (intelligence as { meta?: { source?: { latestCanonicalEventAt?: unknown } } })?.meta?.source
        ?.latestCanonicalEventAt === "string"
        ? ((intelligence as { meta?: { source?: { latestCanonicalEventAt?: string } } }).meta!.source!
            .latestCanonicalEventAt as IsoDateTimeString)
        : undefined;

    const createdAt: IsoDateTimeString = new Date().toISOString();

    const baseDoc = {
      schemaVersion: 1 as const,
      id: dateId,
      userId,
      date: dateId,
      createdAt,
      anchors: {
        latestCanonicalEventAt,
        dailyFactsComputedAt: dailyFacts?.computedAt,
        intelligenceComputedAt,
      },
      counts: {},
      readiness: {
        hasDailyFacts: dailyFactsSnap.exists,
        hasIntelligenceContext: true,
      },
    };

    const validated = dayTruthDocSchema.safeParse(baseDoc);
    if (!validated.success) {
      logger.warn("Invalid DayTruth doc (dropping)", {
        userId,
        date: dateId,
        issues: validated.error.flatten(),
      });
      return;
    }

    const dayTruthRef = userRef.collection("dayTruth").doc(dateId);
    const revisionId = safeRevisionId(intelligenceComputedAt);
    const revisionRef = dayTruthRef.collection("revisions").doc(revisionId);

    // 1) Always append revision (idempotent via deterministic revisionId)
    try {
      await revisionRef.create({ ...validated.data, revisionId });
    } catch {
      // If it exists, ignore (replay-safe)
    }

    // 2) Create base snapshot only if absent (immutable “first known”)
    try {
      await dayTruthRef.create(validated.data);
    } catch {
      // exists => do not overwrite
    }
  }
);
