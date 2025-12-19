// services/functions/src/http/ingestRawEventHttp.ts

import {
    onRequest,
    HttpsError,
    type Request
  } from "firebase-functions/v2/https";
  import { ingestRawEvent } from "../ingestion/rawEvents";
  import type { IngestRawEventInput } from "../ingestion/rawEvents";
  import type { CanonicalEventKind } from "../types/health";
  
  /**
   * Express-style Request with Firebase auth attached.
   */
  interface AuthedRequest extends Request {
    auth?: {
      uid: string;
      token?: unknown;
    };
  }
  
  const CANONICAL_EVENT_KINDS: CanonicalEventKind[] = [
    "sleep",
    "steps",
    "workout",
    "weight",
    "hrv"
  ];
  
  /**
   * Ensures the provided value is a valid CanonicalEventKind.
   */
  function assertCanonicalEventKind(value: unknown): CanonicalEventKind {
    if (typeof value !== "string") {
      throw new HttpsError("invalid-argument", "kind must be a string");
    }
  
    const asKind = value as CanonicalEventKind;
    if (!CANONICAL_EVENT_KINDS.includes(asKind)) {
      throw new HttpsError(
        "invalid-argument",
        `Unsupported kind "${value}". Expected one of: ${CANONICAL_EVENT_KINDS.join(
          ", "
        )}`
      );
    }
  
    return asKind;
  }
  
  /**
   * Validates the HTTP request body and transforms it into IngestRawEventInput.
   */
  function parseRequestBody(body: unknown, userId: string): IngestRawEventInput {
    if (!body || typeof body !== "object") {
      throw new HttpsError("invalid-argument", "Missing or invalid request body");
    }
  
    const maybe = body as Record<string, unknown>;
  
    const sourceId = maybe.sourceId;
    const sourceType = maybe.sourceType;
    const provider = maybe.provider;
    const kind = maybe.kind;
    const observedAt = maybe.observedAt;
    const payload = maybe.payload;
  
    if (!sourceId || typeof sourceId !== "string") {
      throw new HttpsError("invalid-argument", "sourceId is required");
    }
  
    if (!provider || typeof provider !== "string") {
      throw new HttpsError("invalid-argument", "provider is required");
    }
  
    if (!observedAt || typeof observedAt !== "string") {
      throw new HttpsError("invalid-argument", "observedAt is required");
    }
  
    const canonicalKind = assertCanonicalEventKind(kind);
  
    return {
      userId,
      sourceId,
      // HealthSourceType is validated at a higher layer; we treat it as passthrough here.
      // In practice this should be one of: wearable, mobile_app, manual, lab, device, import.
      sourceType: sourceType as IngestRawEventInput["sourceType"],
      provider,
      kind: canonicalKind,
      observedAt,
      payload
    };
  }
  
  /**
   * HTTPS function for the mobile app to send RawEvents.
   *
   * Enforces:
   * - Auth required
   * - userId must match request.auth.uid
   * - Valid IngestRawEventInput fields
   * - Delegates to ingestRawEvent()
   */
  export const ingestRawEventHttp = onRequest(
    { region: "us-central1" },
    async (req, res) => {
      try {
        const { auth } = req as AuthedRequest;
  
        // Require authentication
        if (!auth) {
          throw new HttpsError("unauthenticated", "User must be authenticated");
        }
  
        const userId = auth.uid;
  
        // Validate & parse request body
        const input = parseRequestBody(req.body, userId);
  
        // Use core ingestion logic
        const result = await ingestRawEvent(input);
  
        res.status(200).json({ ok: true, rawEvent: result });
      } catch (error) {
        console.error("ingestRawEventHttp error:", error);
  
        if (error instanceof HttpsError) {
          res.status(400).json({ ok: false, error: error.message });
          return;
        }
  
        const message =
          error instanceof Error ? error.message : "Unknown internal error";
        res.status(500).json({ ok: false, error: message });
      }
    }
  );
  