import { PubSub } from '@google-cloud/pubsub';
import { logger } from '../utils/logger.js';

const pubsub = new PubSub();

export const publishJson = async (
  topic: string,
  data: Record<string, unknown>,
  attributes: Record<string, string>
): Promise<string> => {
  const buf = Buffer.from(JSON.stringify(data));
  const messageId = await pubsub.topic(topic).publish(buf, attributes);
  logger.info({ topic, messageId, attributes }, 'pubsub.publish');
  return messageId;
};
