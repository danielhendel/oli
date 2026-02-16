import type { Request, Response } from "express";
import { z } from "zod";
import { rollupDaily } from "../facts.js";

// --- utils: UTC-safe YMD handling ---
const Ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD");

function parseYmdUTC(ymd: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) throw new Error(`Invalid YMD: ${ymd}`);
  const y = Number(m[1]);
  const mon = Number(m[2]);
  const d = Number(m[3]);
  return new Date(Date.UTC(y, mon - 1, d));
}
function formatYmdUTC(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function addDaysUTC(d: Date, days: number): Date {
  const copy = new Date(d.getTime());
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}
function* dateRangeYmd(fromYmd: string, toYmd: string): Generator<string> {
  let cur = parseYmdUTC(fromYmd);
  const end = parseYmdUTC(toYmd);
  while (cur <= end) {
    yield formatYmdUTC(cur);
    cur = addDaysUTC(cur, 1);
  }
}

// --- payload schema ---
const BodySchema = z
  .object({
    uid: z.string().min(1, "uid required"),
    from: Ymd,
    to: Ymd,
  })
  .refine(({ from, to }) => parseYmdUTC(from) <= parseYmdUTC(to), {
    message: "`from` must be <= `to`",
    path: ["from"],
  });

/**
 * POST /jobs/backfill
 * Body: { uid: "abc", from: "YYYY-MM-DD", to: "YYYY-MM-DD" }
 * Requires auth in production (IAP / middleware / shared secret).
 */
export async function backfill(req: Request, res: Response): Promise<Response> {
  try {
    const { uid, from, to } = BodySchema.parse(req.body ?? {});
    let days = 0;

    for (const ymd of dateRangeYmd(from, to)) {
      await rollupDaily(uid, ymd);
      days += 1;
    }

    return res.status(200).json({ ok: true, uid, from, to, days });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ ok: false, error: "Invalid body", issues: e.issues });
    }
    const err = e as Error;
    return res.status(500).json({ ok: false, error: err.message });
  }
}
