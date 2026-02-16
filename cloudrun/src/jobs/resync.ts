// cloudrun/src/jobs/resync.ts
/**
 * Purpose: Resync last 30 days of data from Oura or Withings.
 * Inputs: POST /jobs/resync { uid: string, provider: "oura" | "withings" }
 * Side-effects: Fetches data from provider APIs, writes normalized events.
 * Errors: Returns JSON with ok:false on validation/fetch/write errors.
 */
import type { Request, Response } from "express";
import { createHash } from "node:crypto";
import { z } from "zod";
import {
  getFirestore,
  FieldValue,
  type Firestore,
  type DocumentData,
  type WriteBatch,
} from "firebase-admin/firestore";

const DAYS = 30;

// ---------- helpers ----------
const BodySchema = z.object({
  uid: z.string().min(1, "uid required"),
  provider: z.enum(["oura", "withings"]),
});

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
function hash32(raw: string): string {
  return createHash("sha256").update(raw).digest("hex").slice(0, 32);
}
function ymdFromIso(iso: string): string {
  return iso.slice(0, 10);
}

async function commitInBatches(
  db: Firestore,
  uid: string,
  docs: Array<{ id: string; data: DocumentData }>
) {
  const hasBatch =
    typeof (db as unknown as { batch?: () => WriteBatch }).batch === "function";

  // Fallback path for tests/mocks that don't provide db.batch()
  if (!hasBatch) {
    for (const group of chunk(docs, 450)) {
      for (const { id, data } of group) {
        await db
          .collection("users")
          .doc(uid)
          .collection("events")
          .doc(id)
          .set(data, { merge: false });
      }
    }
    return;
  }

  // Preferred path when batch() is available
  for (const group of chunk(docs, 450)) {
    const batch: WriteBatch = (db as unknown as { batch: () => WriteBatch }).batch();
    for (const { id, data } of group) {
      batch.set(
        db.collection("users").doc(uid).collection("events").doc(id),
        data,
        { merge: false }
      );
    }
    await batch.commit();
  }
}

// Minimal shapes (only fields we read)
type OuraWorkout = { id?: string; start_time?: string } & Record<string, unknown>;
type WithingsMeasureGroup = { grpid?: number; date: number } & Record<string, unknown>;

// ---------- handler ----------
export async function resync(req: Request, res: Response): Promise<Response> {
  try {
    const { uid, provider } = BodySchema.parse(req.body ?? {});
    if (provider === "oura") {
      await resyncOura(uid);
    } else {
      await resyncWithings(uid);
    }
    return res.status(200).json({ ok: true, provider, uid });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res
        .status(400)
        .json({ ok: false, error: "invalid_body", issues: e.issues });
    }
    console.error("resync error", e);
    return res.status(500).json({ ok: false, error: (e as Error).message });
  }
}

// ---------- providers ----------
async function resyncOura(uid: string) {
  const db = getFirestore();

  const integRef = db
    .collection("users")
    .doc(uid)
    .collection("integrations")
    .doc("oura");
  const integSnap = await integRef.get();
  if (!integSnap.exists) throw new Error("oura_integration_missing");
  const { access_token } = integSnap.data() as { access_token?: string };
  if (!access_token) throw new Error("oura_token_missing");

  const today = new Date();
  const start = new Date(
    Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate() - DAYS
    )
  );
  const startStr = ymdFromIso(start.toISOString());
  const endStr = ymdFromIso(today.toISOString());

  const resp = await fetch(
    `https://api.ouraring.com/v2/usercollection/workout?start_date=${startStr}&end_date=${endStr}`,
    { headers: { Authorization: `Bearer ${access_token}` } }
  );
  if (!resp.ok) throw new Error(`oura_fetch_failed_${resp.status}`);

  const json = (await resp.json()) as { data?: OuraWorkout[] };
  const workouts: OuraWorkout[] = Array.isArray(json.data) ? json.data : [];

  const docs = workouts.map((w) => {
    const raw = JSON.stringify(w);
    const providerEventId = w.id ?? hash32(raw);
    const eventId = `oura_${providerEventId}`;
    const startIso =
      typeof w.start_time === "string" ? w.start_time : new Date().toISOString();
    const ymd = ymdFromIso(startIso);

    return {
      id: eventId,
      data: {
        type: "workout",
        ymd,
        payload: w,
        meta: {
          source: "resync:oura",
          version: 1,
          createdAt: FieldValue.serverTimestamp(),
          idempotencyKey: providerEventId,
        },
      },
    };
  });

  if (docs.length > 0) {
    await commitInBatches(db, uid, docs);
  }
}

async function resyncWithings(uid: string) {
  const db = getFirestore();

  const integRef = db
    .collection("users")
    .doc(uid)
    .collection("integrations")
    .doc("withings");
  const integSnap = await integRef.get();
  if (!integSnap.exists) throw new Error("withings_integration_missing");
  const { access_token } = integSnap.data() as { access_token?: string };
  if (!access_token) throw new Error("withings_token_missing");

  const nowSec = Math.floor(Date.now() / 1000);
  const startSec = nowSec - DAYS * 24 * 60 * 60;

  const body = new URLSearchParams({
    access_token,
    action: "getmeas",
    startdate: String(startSec),
    enddate: String(nowSec),
  });

  const resp = await fetch("https://wbsapi.withings.net/measure", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!resp.ok) throw new Error(`withings_fetch_failed_${resp.status}`);

  const json = (await resp.json()) as {
    body?: { measuregrps?: WithingsMeasureGroup[] };
  };
  const groups: WithingsMeasureGroup[] = Array.isArray(json.body?.measuregrps)
    ? json.body!.measuregrps!
    : [];

  const docs = groups.map((m) => {
    const raw = JSON.stringify(m);
    const providerEventId = m.grpid != null ? String(m.grpid) : hash32(raw);
    const eventId = `withings_${providerEventId}`;
    const ymd = ymdFromIso(new Date((m.date ?? 0) * 1000).toISOString());

    return {
      id: eventId,
      data: {
        type: "measurement",
        ymd,
        payload: m,
        meta: {
          source: "resync:withings",
          version: 1,
          createdAt: FieldValue.serverTimestamp(),
          idempotencyKey: providerEventId,
        },
      },
    };
  });

  if (docs.length > 0) {
    await commitInBatches(db, uid, docs);
  }
}
