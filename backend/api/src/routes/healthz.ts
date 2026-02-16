import type { Request, Response } from 'express';

export const healthz = (_req: Request, res: Response) => {
  res.status(200).json({ ok: true, service: 'api', sha: process.env.GIT_SHA ?? 'dev' });
};
