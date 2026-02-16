// services/normalizer/src/index.ts
/* Intent: Cloud Run server that exposes healthz and Pub/Sub push endpoint for event normalization */
import express, { Request, Response } from "express";
import { z } from "zod";
import admin from "firebase-admin";
import { log } from "./lib/log.js"; // NOTE: ".js" for Node ESM

// ---- Types ----
/** Minimal app event we accept; expand as you formalize */
const AppEventSchema = z.object({
  type: z.string(),
  version: z.string(),
  uid: z.string().optional(),
  ts: z.number().int().optional(),
  payload: z.unknown().optional(),
});
type AppEventT = z.infer<typeof AppEventSchema>;

// Pub/Sub JSON push envelope (HTTP push with JSON)
const Envelope = z.object({
  message: z.object({
    data: z.string(),
    attributes: z.record(z.string()).optional(),
    messageId: z.string().optional(),
    publishTime: z.string().optional(),
  }),
});

// ---- Firebase Admin (guarded init) ----
if (!admin.apps.length) {
  admin.initializeApp();
}

// ---- App ----
const app = express();
app.use(express.json());

app.get("/healthz", (_req: Request, res: Response) => res.status(200).send("ok"));

// Replace this stub with your real normalization pipeline
async function normalizeEvent(raw: unknown): Promise<void> {
  const obj: unknown = typeof raw === "string" ? JSON.parse(raw) : raw;
  const parsed = AppEventSchema.safeParse(obj);
  if (!parsed.success) {
    log.warn("normalizer.schema_violation", {
      labels: { err: parsed.error.message },
    });
    throw new Error("invalid_event");
  }
  const evt: AppEventT = parsed.data;

  // TODO: call your existing parsing/validation and Firestore writes here.
  log.info("normalizer.ok", {
    labels: {
      type: evt.type,
      version: evt.version,
    },
  });
}

// Pub/Sub push endpoint
app.post("/_ah/push", async (req: Request, res: Response) => {
  try {
    const parsed = Envelope.safeParse(req.body);
    if (!parsed.success) {
      log.warn("normalizer.bad_envelope", { labels: { err: parsed.error.message } });
      return res.status(400).end();
    }
    const b64 = parsed.data.message.data;
    const json = Buffer.from(b64, "base64").toString("utf8");
    await normalizeEvent(json);
    return res.status(204).end();
  } catch (e) {
    log.error("normalizer.err", { labels: { err: e instanceof Error ? e.message : String(e) } });
    return res.status(500).end();
  }
});

// ---- Start server (Cloud Run needs this) ----
const port = Number(process.env.PORT) || 8080;
app.listen(port, "0.0.0.0", () => {
  log.info("normalizer.listen", { labels: { port } });
});
