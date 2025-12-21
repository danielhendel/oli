// services/api/src/server.ts

/**
 * IMPORTANT:
 * This import MUST run before any other firebase-admin usage
 * to ensure the Admin SDK is initialized with the correct projectId.
 */
import "./lib/firebaseAdmin";

import app from "./index";

const port = Number(process.env.PORT ?? "8080");

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on port ${port}`);
});
