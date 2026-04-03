/**
 * Scheduled Oura pull — sleep + HRV for all connected users.
 * Calls POST /integrations/oura/pull (invoker-only).
 *
 * Requirements:
 * - OLI_API_BASE_URL must be set (Cloud Run API base).
 * - INVOKER_ALLOWED_EMAILS (or INVOKER_ALLOWED_SUBS) on the API must include this function's service account.
 * - Cloud Run IAM must grant roles/run.invoker to that SA.
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import { GoogleAuth } from "google-auth-library";

export const onOuraPullScheduled = onSchedule(
  {
    schedule: "every 15 minutes",
    region: "us-central1",
    serviceAccount: "oli-functions-runtime@oli-staging-fdbba.iam.gserviceaccount.com",
  },
  async () => {
    const baseUrl = (process.env.OLI_API_BASE_URL ?? "").trim().replace(/\/+$/, "");
    if (!baseUrl) {
      logger.warn("onOuraPullScheduled: OLI_API_BASE_URL not set; skipping");
      return;
    }

    logger.info("oura_pull_scheduled_start");

    const url = `${baseUrl}/integrations/oura/pull`;
    try {
      const auth = new GoogleAuth();
      const client = await auth.getIdTokenClient(baseUrl);
      const res = await client.request({
        url,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        data: {},
      });

      const status = res.status;
      const data = res.data as
        | { ok?: boolean; usersProcessed?: number; eventsCreated?: number; eventsAlreadyExists?: number }
        | undefined;
      logger.info("oura_pull_scheduled_done", {
        status,
        ok: data?.ok,
        usersProcessed: data?.usersProcessed,
        eventsCreated: data?.eventsCreated,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error("onOuraPullScheduled failed", { err: message });
      throw err;
    }
  },
);
