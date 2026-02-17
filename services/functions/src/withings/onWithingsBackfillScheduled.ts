/**
 * Phase 3B.1 — Scheduled backfill resume for Withings.
 * Calls POST /integrations/withings/backfill with mode=resume (invoker-only).
 * Idempotent: only users with backfill.status running/error are processed.
 *
 * Requirements:
 * - OLI_API_BASE_URL must be set (Cloud Run API base, e.g. https://oli-api-xxx.run.app).
 * - WITHINGS_PULL_INVOKER_EMAILS on the API must include this function's service account:
 *   oli-functions-runtime@oli-staging-fdbba.iam.gserviceaccount.com
 * - Cloud Run IAM must grant roles/run.invoker to that SA.
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import { GoogleAuth } from "google-auth-library";

const BACKFILL_BODY = {
  mode: "resume" as const,
  yearsBack: 10,
  chunkDays: 90,
  maxChunks: 5,
};

export const onWithingsBackfillScheduled = onSchedule(
  {
    schedule: "every 15 minutes",
    region: "us-central1",
    serviceAccount: "oli-functions-runtime@oli-staging-fdbba.iam.gserviceaccount.com",
  },
  async () => {
    const baseUrl = (process.env.OLI_API_BASE_URL ?? "").trim().replace(/\/+$/, "");
    if (!baseUrl) {
      logger.warn("onWithingsBackfillScheduled: OLI_API_BASE_URL not set; skipping");
      return;
    }

    const url = `${baseUrl}/integrations/withings/backfill`;
    try {
      const auth = new GoogleAuth();
      const client = await auth.getIdTokenClient(baseUrl);
      const res = await client.request({
        url,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        data: BACKFILL_BODY,
      });

      const status = res.status;
      const data = res.data as { ok?: boolean; usersProcessed?: number; eventsCreated?: number } | undefined;
      logger.info("onWithingsBackfillScheduled completed", {
        status,
        ok: data?.ok,
        usersProcessed: data?.usersProcessed,
        eventsCreated: data?.eventsCreated,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error("onWithingsBackfillScheduled failed", { err: message });
      throw err;
    }
  },
);
