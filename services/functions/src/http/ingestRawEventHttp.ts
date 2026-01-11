// services/functions/src/http/ingestRawEventHttp.ts
import type { Request, Response } from "express";

/**
 * Deprecated ingestion entrypoint (DO NOT USE).
 *
 * Oli uses a single ingestion front door: Cloud Run API `/ingest/events`.
 * This handler is intentionally disabled to prevent drift and ambiguity.
 *
 * Contract: always returns 410 Gone.
 */
export const ingestRawEventHttp = async (_req: Request, res: Response): Promise<void> => {
  // Optional headers: work in real Express, no-op in minimal test doubles.
  const r = res as unknown as {
    setHeader?: (name: string, value: string) => void;
    set?: (name: string, value: string) => void;
    header?: (name: string, value: string) => void;
  };

  if (typeof r.setHeader === "function") {
    r.setHeader("Cache-Control", "no-store");
    r.setHeader("Allow", "POST");
  } else if (typeof r.set === "function") {
    r.set("Cache-Control", "no-store");
    r.set("Allow", "POST");
  } else if (typeof r.header === "function") {
    r.header("Cache-Control", "no-store");
    r.header("Allow", "POST");
  }

  res.status(410).json({
    ok: false,
    error: "Deprecated endpoint",
    message: "This ingestion endpoint has been retired. Use Cloud Run API: POST /ingest/events",
  });
};
