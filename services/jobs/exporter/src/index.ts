// services/jobs/exporter/src/index.ts
import express from "express";
import { z } from "zod";
import admin from "firebase-admin";
import { Storage } from "@google-cloud/storage";
import { log, LogFields } from "./lib/log.js";

if (!admin.apps.length) admin.initializeApp();
const storage = new Storage();
const BUCKET = process.env.EXPORT_BUCKET!; // set via Cloud Run env

const app = express();
app.use(express.json());

const Envelope = z.object({ message: z.object({ data: z.string() }) });
const ExportReq = z.object({ uid: z.string(), exportId: z.string().uuid().optional() });

app.post("/_ah/push", async (req, res) => {
  const env = Envelope.safeParse(req.body);
  if (!env.success) return res.status(400).end();

  const rawJson = Buffer.from(env.data.message.data, "base64").toString("utf8");
  let raw: unknown;
  try {
    raw = JSON.parse(rawJson);
  } catch {
    return res.status(400).end();
  }

  const parsed = ExportReq.safeParse(raw);
  if (!parsed.success) return res.status(400).end();

  const { uid } = parsed.data;
  try {
    const db = admin.firestore();

    const profileSnap = await db.collection(`/users/${uid}/profile`).get();
    const factsSnap = await db.collection(`/facts/${uid}/training`).get();

    const profile = Object.fromEntries(profileSnap.docs.map((d) => [d.id, d.data()]));
    const facts = factsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    const bundle = {
      generatedAt: new Date().toISOString(),
      uid,
      profile,
      facts,
    };

    const filePath = `exports/${uid}/${Date.now()}.json`;
    const file = storage.bucket(BUCKET).file(filePath);
    await file.save(JSON.stringify(bundle), { contentType: "application/json" });

    const [url] = await file.getSignedUrl({ action: "read", expires: Date.now() + 1000 * 60 * 60 });

    await db.doc(`/users/${uid}/exports/latest`).set(
      {
        status: "complete",
        url,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    const fields: LogFields = { uid, labels: { op: "export" } };
    log.info("exporter.ok", fields);
    return res.status(204).end();
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    log.error("exporter.err", { labels: { err: msg } });
    return res.status(500).end();
  }
});

app.get("/healthz", (_req, res) => res.send("ok"));
app.listen(process.env.PORT || 8080);
