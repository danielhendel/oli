/**
 * STAGING-ONLY (NO EMULATORS)
 *
 * This API is designed to run against the real STAGING Firebase project in all environments.
 * Any emulator/local switching is explicitly out of scope until after MVP launch.
 */

const assertNoEmulators = (): void => {
  const offenders: string[] = [];
  if (process.env.FIRESTORE_EMULATOR_HOST) offenders.push("FIRESTORE_EMULATOR_HOST");
  if (process.env.FIREBASE_AUTH_EMULATOR_HOST) offenders.push("FIREBASE_AUTH_EMULATOR_HOST");

  if (offenders.length > 0) {
    throw new Error(
      `Emulator environment variables are not allowed in this repo right now: ${offenders.join(
        ", "
      )}. Remove them and run against STAGING.`
    );
  }
};

const main = async (): Promise<void> => {
  assertNoEmulators();

  // Initialize Firebase Admin first (reads env at import time)
  await import("./lib/firebaseAdmin");

  // Import Express app after firebase-admin init
  const mod = await import("./index");
  const app = mod.default;

  // Cloud Run required port
  const port = Number(process.env.PORT ?? "8080");

  app.listen(port, () => {
    console.log(`API listening on port ${port} (STAGING-ONLY)`);
  });
};

void main();
