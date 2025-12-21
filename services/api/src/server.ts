// services/api/src/server.ts

/**
 * IMPORTANT:
 * Load env FIRST (from services/api/.env.local),
 * then initialize firebase-admin,
 * then import the Express app.
 */

import path from "path";
import dotenv from "dotenv";

dotenv.config({
  path: path.resolve(__dirname, "../.env.local"),
});

const main = async () => {
  // Ensure firebase-admin is initialized AFTER env is loaded
  await import("./lib/firebaseAdmin");

  // Import app AFTER firebase admin initialization
  const mod = await import("./index");
  const app = mod.default;

  const port = Number(process.env.PORT ?? "8080");
  app.listen(port, () => {
    console.log(`API listening on port ${port}`);
  });
};

void main();
