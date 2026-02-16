// services/jobs/account-deleter/src/index.ts
import express from "express";
import { z } from "zod";
import admin from "firebase-admin";
import { log, LogFields } from "./lib/log.js";

if (!admin.apps.length) admin.initializeApp();
const app = express();
app.use(express.json());

const Envelope = z.object({ message: z.object({ data: z.string() }) });
const DeleteReq = z.object({ uid: z.string() });

async function deleteCollectionRecursive(
  db: admin.firestore.Firestore,
  path: string,
  batchSize = 250
) {
  const ref = db.collection(path);
  while (true) {
    const snap = await ref.limit(batchSize).get();
    if (snap.empty) break;
    const batch = db.batch();
    for (const doc of snap.docs) batch.delete(doc.ref);
    await batch.commit();
  }
}

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

  const parsed = DeleteReq.safeParse(raw);
  if (!parsed.success) return res.status(400).end();

  const { uid } = parsed.data;
  try {
    const db = admin.firestore();

    await deleteCollectionRecursive(db, `/users/${uid}/profile`);
    await deleteCollectionRecursive(db, `/facts/${uid}/training`);
    await db.doc(`/users/${uid}`).delete({ exists: true } as unknown as admin.firestore.Precondition);

    await db.collection("audit").add({
      type: "account.delete",
      uid,
      ts: admin.firestore.FieldValue.serverTimestamp(),
    });

    const fields: LogFields = { uid, labels: { op: "account.delete" } };
    log.info("deleter.ok", fields);
    return res.status(204).end();
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    log.error("deleter.err", { labels: { err: msg } });
    return res.status(500).end();
  }
});

app.get("/healthz", (_req, res) => res.send("ok"));
app.listen(process.env.PORT || 8080);
