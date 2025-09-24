import { PubSub } from "@google-cloud/pubsub";

const pubsub = new PubSub();

export async function publishJSON<T extends object>(
  topic: string,
  data: T,
  attributes: Record<string, string> = {}
) {
  const t = pubsub.topic(topic);
  // SDK accepts { json: any } at runtime; keep our callsite typed with <T extends object>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const messageId = await t.publishMessage({ json: data as any, attributes });
  return messageId;
}
