/**
 * Oura post-raw durable handler: subscribed to oura.post_raw.v1.
 * Writes vendor sleep + readiness snapshots and integration metadata.
 */

import { onMessagePublished } from "firebase-functions/v2/pubsub";
import { logger } from "firebase-functions";
import { runOuraPostRaw, type SleepDoc, type ReadinessDoc } from "./ouraPostRawHandler";

const TOPIC = "oura.post_raw.v1";

type OuraPostRawMessage = {
  uid: string;
  requestId?: string;
  sleepDocs?: unknown[];
  readinessDocs?: unknown[];
  dailySleepDocs?: unknown[];
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
      logger.error("oura.post_raw: invalid payload");
      return;
    }

    const {
      uid,
      requestId = event.id ?? "unknown",
      sleepDocs = [],
      readinessDocs = [],
      dailySleepDocs = [],
    } = payload as OuraPostRawMessage;

    if (!assertUid(uid)) {
      logger.error("oura.post_raw: invalid uid", { uid });
      return;
    }

    const sleep = Array.isArray(sleepDocs) ? sleepDocs : [];
    const readiness = Array.isArray(readinessDocs) ? readinessDocs : [];
    const dailySleep = Array.isArray(dailySleepDocs) ? dailySleepDocs : [];

    try {
      await runOuraPostRaw(
        uid,
        requestId,
        sleep as SleepDoc[],
        readiness as ReadinessDoc[],
        dailySleep as import("../../../api/src/lib/ouraApi").OuraDailySleepDocument[],
      );
    } catch (err) {
      logger.error("oura.post_raw: failed", { uid, requestId, err });
      throw err;
    }
  },
);
