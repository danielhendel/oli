import type { Response } from 'express';
import type { AuthedRequest } from '../middleware/auth.js';
import { publishJson } from '../clients/pubsub.js';
import { newTraceId } from '../utils/trace.js';
import { randomUUID } from 'node:crypto';

export const requestExport = async (req: AuthedRequest, res: Response) => {
  const jobId = randomUUID();
  const traceId = req.header('X-Trace-Id') ?? newTraceId();
  await publishJson(process.env.EXPORTS_TOPIC!, { jobId }, { uid: req.uid!, traceId });
  return res.status(202).json({ jobId, traceId });
};
