// services/functions/src/scripts/setAdminClaim.ts
import { admin } from "../firebaseAdmin";
/**
 * Usage:
 *   ts-node src/scripts/setAdminClaim.ts <UID>
 *
 * Sets { admin: true } custom claim on the given user.
 */
async function run() {
    const uid = process.argv[2];
    if (!uid) {
        throw new Error("Usage: ts-node setAdminClaim.ts <UID>");
    }
    await admin.auth().setCustomUserClaims(uid, { admin: true });
    console.log(`✅ Admin claim set for user ${uid}`);
}
run().catch((err) => {
    console.error("❌ Failed to set admin claim", err);
    process.exit(1);
});
