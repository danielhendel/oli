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

  // Import Express app. Firebase Admin should initialize lazily when first used (via getDb/getAdminApp).
  const mod = await import("./index");
  const app = mod.default;

  // Cloud Run required port
  const raw = (process.env.PORT ?? "8080").trim();
  const port = Number(raw);
  const safePort = Number.isFinite(port) && port > 0 ? port : 8080;

  // Startup stamp (proves which build is deployed)
  // eslint-disable-next-line no-console
  console.log(
    `[api] boot STAGING-ONLY port=${safePort} service=${process.env.K_SERVICE ?? "unknown"} rev=${
      process.env.K_REVISION ?? "unknown"
    }`
  );

  app.listen(safePort, () => {
    // eslint-disable-next-line no-console
    console.log(`API listening on port ${safePort} (STAGING-ONLY)`);
  });
};

void main();
