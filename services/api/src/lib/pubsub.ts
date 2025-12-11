import { PubSub } from "@google-cloud/pubsub";

const pubsub = new PubSub();

export async function publishJSON<T extends object>(
  topic: string,
  data: T,
  attributes: Record<string, string> = {}
) {
  const t = pubsub.topic(topic);

  // Use `unknown` to avoid `any`, while still allowing <T> payloads.
  const messageId = await t.publishMessage({
    json: data as unknown,
    attributes
  });

  return messageId;
}
