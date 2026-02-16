// cloudrun/src/jobs/closeDay.ts
import type { Request, Response } from "express";
import { db } from "../firestore.js";
import { rollupDaily } from "../facts.js";

/**
 * POST /jobs/close-day
 * Body: { ymd?: "YYYY-MM-DD", uid?: "abc" }
 * If uid omitted, iterate all user docs (capped batch for MVP).
 */
export async function closeDay(req: Request, res: Response) {
  const ymd = typeof req.body?.ymd === "string" ? req.body.ymd : new Date().toISOString().slice(0,10);
  const uid = typeof req.body?.uid === "string" ? req.body.uid : "";

  try {
    if (uid) {
      await rollupDaily(uid, ymd);
    } else {
      const users = await db.collection("users").select().limit(1000).get();
      const tasks = users.docs.map(d => rollupDaily(d.id, ymd));
      await Promise.all(tasks);
    }
    return res.status(200).json({ ok: true, ymd });
  } catch (e) {
    return res.status(500).json({ ok: false, error: (e as Error).message });
  }
}
