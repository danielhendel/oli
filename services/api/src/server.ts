/**
 * STAGING-ONLY (NO EMULATORS)
 *
 * This API is designed to run against the real STAGING Firebase project in all environments.
 * Any emulator/local switching is explicitly out of scope until after MVP launch.
 */

import { logger } from "./lib/logger";

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

const port = (() => {
  const raw = process.env.PORT?.trim();
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? n : 8080;
})();

const main = async (): Promise<void> => {
  assertNoEmulators();

  // Initialize Firebase Admin lazily-safe module (should not throw at import-time)
  await import("./lib/firebaseAdmin");

  // Import Express app after firebase-admin init
  const mod = await import("./index");
  const app = mod.default;

  app.listen(port, () => {
    logger.info({
      msg: "api_listening",
      port,
      env: process.env.NODE_ENV ?? "unknown",
      cloudRun: Boolean(process.env.K_SERVICE),
      service: process.env.K_SERVICE ?? null,
      revision: process.env.K_REVISION ?? null,
    });
  });
};

void main();
