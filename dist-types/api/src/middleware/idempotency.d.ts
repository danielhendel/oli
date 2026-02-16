import type { NextFunction, Response } from "express";
import type { AuthedRequest } from "./auth";
/**
 * Simple idempotency middleware:
 * - If Idempotency-Key header is present, we check Firestore for an existing record for (uid,key).
 * - If present, we short-circuit with the stored response (basic ack).
 * - If not, we create a marker and let the request continue.
 *
 * NOTE: This is a minimal Day 1–2 guard. Later we’ll store full response bodies per key.
 */
export declare function idempotencyMiddleware(req: AuthedRequest, res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=idempotency.d.ts.map