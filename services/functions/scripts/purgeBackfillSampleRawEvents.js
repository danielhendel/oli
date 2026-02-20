const admin = require("firebase-admin");

async function main() {
  const PROJECT_ID = "oli-staging-fdbba";
  const TARGET_SOURCE_ID = "backfill.sample";
  const BATCH_SIZE = 200;

  const uid = process.env.TARGET_UID;
  if (!uid) {
    throw new Error(
      "Missing TARGET_UID. Usage: TARGET_UID=... node scripts/purgeBackfillSampleRawEvents.js"
    );
  }

  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: PROJECT_ID,
  });

  const db = admin.firestore();

  let totalDeleted = 0;

  // IMPORTANT: query the user's direct subcollection (no collectionGroup).
  // This avoids composite-index requirements caused by collectionGroup + ordering.
  const col = db.collection("users").doc(uid).collection("rawEvents");

  while (true) {
    const snap = await col
      .where("sourceId", "==", TARGET_SOURCE_ID)
      .limit(BATCH_SIZE)
      .get();

    if (snap.empty) break;

    const batch = db.batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    totalDeleted += snap.size;
    console.log(`Deleted ${snap.size} (total=${totalDeleted})`);
  }

  console.log(`DONE. Total deleted: ${totalDeleted}`);
}

main().catch((e) => {
  const code = e?.code;
  const msg = (e?.message || String(e)).slice(0, 400);
  console.error("FAILED:", code, msg);
  process.exit(1);
});