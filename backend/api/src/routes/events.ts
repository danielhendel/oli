import type { Response } from 'express';
import { z } from 'zod';
import type { AuthedRequest } from '../middleware/auth.js';
import { publishJson } from '../clients/pubsub.js';
import { newTraceId } from '../utils/trace.js';

const IngestSchema = z.object({
  type: z.string().min(1),
  source: z.string().optional(),
  occurredAt: z.string().datetime().optional(),
  payload: z.record(z.any())
});

export const ingest = async (req: AuthedRequest, res: Response) => {
  const parse = IngestSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid body', details: parse.error.flatten() });

  const traceId = req.header('X-Trace-Id') ?? newTraceId();
  const uid = req.uid!;

  await publishJson(process.env.EVENTS_TOPIC!, parse.data, {
    uid,
    traceId,
    type: parse.data.type
  });
  return res.status(202).json({ accepted: true, traceId });
};
