/**
 * HTTPS function for the mobile app to send RawEvents.
 *
 * Enforces:
 * - Auth required
 * - userId must match request.auth.uid
 * - Valid IngestRawEventInput fields
 * - Delegates to ingestRawEvent()
 */
export declare const ingestRawEventHttp: import("firebase-functions/v2/https").HttpsFunction;
//# sourceMappingURL=ingestRawEventHttp.d.ts.map