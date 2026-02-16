// cloudrun/src/account/delete.ts
import type { Request, Response } from "express";
import { getFirestore } from "firebase-admin/firestore";

/**
 * POST /account/delete  { uid: string }
 * Deletes /users/{uid} and common subcollections (events, facts).
 */
export async function deleteUserData(req: Request, res: Response) {
  try {
    const uid = String(req.body?.uid || "");
    if (!uid) return res.status(400).json({ ok: false, error: "uid required" });

    const db = getFirestore();
    const userRef = db.collection("users").doc(uid);

    // Batch delete common subcollections (expand as you add more)
    const batch = db.batch();
    const [eventsDocs, factsDocs] = await Promise.all([
      userRef.collection("events").listDocuments(),
      userRef.collection("facts").listDocuments(),
    ]);
    eventsDocs.forEach((d) => batch.delete(d));
    factsDocs.forEach((d) => batch.delete(d));
    batch.delete(userRef);

    await batch.commit();
    return res.status(200).json({ ok: true, uid });
  } catch (e) {
    return res.status(500).json({ ok: false, error: (e as Error).message });
  }
}
