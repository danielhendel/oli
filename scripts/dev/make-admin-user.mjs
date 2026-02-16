import admin from "firebase-admin";

process.env.FIREBASE_AUTH_EMULATOR_HOST =
  process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "127.0.0.1:9099";

admin.initializeApp({ projectId: "oli-staging-fdbba" });

const email = process.env.ADMIN_EMAIL ?? "admin@example.com";
const password = process.env.ADMIN_PASSWORD ?? "password123";
const adminUid = process.env.ADMIN_UID ?? "u_admin";

async function main() {
  try {
    await admin.auth().getUser(adminUid);
    console.log("User already exists:", adminUid);
  } catch {
    await admin.auth().createUser({
      uid: adminUid,
      email,
      password,
      emailVerified: true,
    });
    console.log("Created user:", adminUid);
  }

  await admin.auth().setCustomUserClaims(adminUid, { admin: true });
  console.log("Set admin claim on:", adminUid);
}

main().catch((err) => {
  console.error("FAILED:", err?.message ?? err);
  process.exit(1);
});
