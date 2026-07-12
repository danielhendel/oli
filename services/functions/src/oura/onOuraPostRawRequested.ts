/**
 * Oura post-raw durable handler: subscribed to oura.post_raw.v1.
 * Writes vendor sleep + readiness + stress snapshots and integration metadata.
 */

import { onMessagePublished } from "firebase-functions/v2/pubsub";
import { runOuraPostRaw, type SleepDoc, type ReadinessDoc } from "./ouraPostRawHandler";
import {
  categorizeOuraPostRawSafeError,
  logOuraPostRawTelemetry,
  sanitizeOuraPostRawRequestId,
} from "./ouraPostRawTelemetry";

const TOPIC = "oura.post_raw.v1";

type OuraPostRawMessage = {
  uid: string;
  requestId?: string;
  sleepDocs?: unknown[];
  readinessDocs?: unknown[];
  dailySleepDocs?: unknown[];
  /** Optional — older producers omit this field. */
  dailyStressDocs?: unknown[];
};

function assertUid(uid: unknown): uid is string {
  return typeof uid === "string" && uid.trim().length > 0;
}

export const onOuraPostRawRequested = onMessagePublished(
  {
    topic: TOPIC,
    region: "us-central1",
    serviceAccount: "oli-functions-runtime@oli-staging-fdbba.iam.gserviceaccount.com",
  },
  async (event) => {
    const payload = event.data?.message?.json as unknown;

    if (!payload || typeof payload !== "object") {
      logOuraPostRawTelemetry({
        operation: "oura_post_raw_rejected",
        safeErrorCode: "FUNCTION_PAYLOAD_INVALID",
      });
      return;
    }

    const {
      uid,
      requestId,
      sleepDocs = [],
      readinessDocs = [],
      dailySleepDocs = [],
      dailyStressDocs = [],
    } = payload as OuraPostRawMessage;

    // Prefer sanitized producer requestId only. Never fall back to Pub/Sub
    // event/message ids — those are transport identifiers, not telemetry traces.
    const safeRequestId = sanitizeOuraPostRawRequestId(requestId);

    if (!assertUid(uid)) {
      logOuraPostRawTelemetry({
        operation: "oura_post_raw_rejected",
        requestId: safeRequestId,
        safeErrorCode: "FUNCTION_PAYLOAD_INVALID",
      });
      return;
    }

    const sleep = Array.isArray(sleepDocs) ? sleepDocs : [];
    const readiness = Array.isArray(readinessDocs) ? readinessDocs : [];
    const dailySleep = Array.isArray(dailySleepDocs) ? dailySleepDocs : [];
    const dailyStress = Array.isArray(dailyStressDocs) ? dailyStressDocs : [];

    try {
      await runOuraPostRaw(
        uid,
        safeRequestId,
        sleep as SleepDoc[],
        readiness as ReadinessDoc[],
        dailySleep as import("../../../api/src/lib/ouraApi").OuraDailySleepDocument[],
        dailyStress as import("../../../api/src/lib/ouraApi").OuraDailyStressDocument[],
      );
    } catch (err) {
      const { safeErrorCode, retryable } = categorizeOuraPostRawSafeError(err, "FUNCTION_PERSIST_FAILED");
      logOuraPostRawTelemetry({
        operation: "oura_post_raw_failed",
        requestId: safeRequestId,
        safeErrorCode,
        retryable,
      });
      throw err;
    }
  },
);
