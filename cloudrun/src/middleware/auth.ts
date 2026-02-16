// cloudrun/src/middleware/auth.ts
import { Request, Response, NextFunction } from "express";
import admin from "firebase-admin";

export interface AuthedRequest extends Request {
  /** App-visible UID (set after verification) */
  uid?: string;
  /** Back-compat for tests that read this property */
  firebaseUid?: string;
}

/**
 * Express middleware: verifies a Firebase ID token from the Authorization header
 * and attaches the UID to the request.
 *
 * NOTE: Call `admin.initializeApp()` once in your app entry (index.ts), not here.
 */
export async function requireFirebaseUser(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Read the header defensively (supports .get() and raw headers object)
  const viaGet =
    typeof req.get === "function" &&
    (req.get("authorization") || req.get("Authorization"));

  const viaHeaders =
    (req.headers &&
      (req.headers as Record<string, string | string[] | undefined>)
        .authorization) ||
    (req as unknown as { authorization?: string }).authorization;

  const authz = (viaGet || viaHeaders) as string | undefined;

  if (typeof authz !== "string" || !authz.startsWith("Bearer ")) {
    res.status(401).json({ ok: false, error: "Missing bearer token" });
    return;
  }

  const idToken = authz.slice("Bearer ".length);

  try {
    // Pass the boolean flag so tests can assert the call signature.
    const decoded = await admin.auth().verifyIdToken(idToken, true);
    req.uid = decoded.uid;
    req.firebaseUid = decoded.uid; // keep for test compatibility
    next();
  } catch {
    res.status(401).json({ ok: false, error: "Invalid token" });
  }
}
