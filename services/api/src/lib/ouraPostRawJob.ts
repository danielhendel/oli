/**
 * Durable Oura post-raw job: publish to Pub/Sub so a Cloud Function runs
 * vendor snapshots + metadata instead of in-process fire-and-forget.
 */

import { publishJSON } from "./pubsub";
import type { OuraSleepDocument, OuraDailyReadinessDocument } from "./ouraApi";

export type OuraPostRawPayload = {
  uid: string;
  requestId: string;
  sleepDocs: OuraSleepDocument[];
  readinessDocs: OuraDailyReadinessDocument[];
};

const TOPIC_ENV_KEY = "TOPIC_OURA_POST_RAW";

/**
 * Returns the configured topic name, or null if not set (e.g. local dev).
 */
export function getOuraPostRawTopic(): string | null {
  const v = process.env[TOPIC_ENV_KEY];
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Publish a post-raw job to Pub/Sub. Returns message id if topic is configured and publish succeeds; null otherwise.
 */
export async function publishOuraPostRawJob(
  uid: string,
  requestId: string,
  sleepDocs: OuraSleepDocument[],
  readinessDocs: OuraDailyReadinessDocument[],
): Promise<string | null> {
  const topic = getOuraPostRawTopic();
  if (!topic) return null;

  const payload: OuraPostRawPayload = {
    uid,
    requestId,
    sleepDocs,
    readinessDocs,
  };
  const messageId = await publishJSON(topic, payload, {
    uid,
    requestId,
    kind: "oura.post_raw.v1",
  });
  return messageId;
}
