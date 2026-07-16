/**
 * Unit tests: categorizeOuraPostRawSafeError + logOuraPostRawTelemetry emit only
 * privacy-safe fields. Logger output is captured and never printed.
 */
import { logger } from "firebase-functions";
import {
  categorizeOuraPostRawSafeError,
  logOuraPostRawTelemetry,
  sanitizeOuraPostRawRequestId,
  type OuraPostRawTelemetryEvent,
} from "../ouraPostRawTelemetry";
import { assertOuraTelemetryPrivacy } from "../../../../api/src/lib/testSupport/assertOuraTelemetryPrivacy";

const SAFE_REQUEST_ID = "3237605a-ceb7-44bc-958e-be8954b9e939";

jest.mock("firebase-functions", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe("categorizeOuraPostRawSafeError", () => {
  it("maps transient firestore-like errors to FUNCTION_PERSIST_FAILED retryable", () => {
    expect(categorizeOuraPostRawSafeError(new Error("UNAVAILABLE: transient"))).toEqual({
      safeErrorCode: "FUNCTION_PERSIST_FAILED",
      retryable: true,
    });
  });

  it("falls back to hint / UNKNOWN without leaking Error.message", () => {
    const err = new Error("uid=user_secret_abc day=2026-07-12");
    const result = categorizeOuraPostRawSafeError(err);
    expect(result.safeErrorCode).toBe("UNKNOWN");
    expect(JSON.stringify(result)).not.toContain("user_secret");
    expect(JSON.stringify(result)).not.toContain("2026-07-12");
  });
});

describe("logOuraPostRawTelemetry", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const sampleEvents: OuraPostRawTelemetryEvent[] = [
    {
      operation: "oura_post_raw_started",
      requestId: "3237605a-ceb7-44bc-958e-be8954b9e939",
      sleepDocumentCount: 2,
      readinessDocumentCount: 2,
      dailySleepDocumentCount: 1,
      dailyStressDocumentCount: 1,
    },
    {
      operation: "oura_post_raw_completed",
      requestId: "3237605a-ceb7-44bc-958e-be8954b9e939",
      writtenCount: 5,
      sleepDocumentCount: 2,
      readinessDocumentCount: 2,
      dailyStressDocumentCount: 1,
      sleepNightDocumentCount: 2,
      metadataWritten: true,
    },
    { operation: "oura_post_raw_rejected", requestId: "3237605a-ceb7-44bc-958e-be8954b9e939", safeErrorCode: "FUNCTION_PAYLOAD_INVALID" },
    {
      operation: "oura_post_raw_failed",
      requestId: "3237605a-ceb7-44bc-958e-be8954b9e939",
      safeErrorCode: "FUNCTION_PERSIST_FAILED",
      retryable: true,
    },
    {
      operation: "oura_post_raw_domain_docs_received",
      requestId: "3237605a-ceb7-44bc-958e-be8954b9e939",
      domain: "sleep",
      sleepDocumentCount: 2,
      dailySleepDocumentCount: 1,
    },
    {
      operation: "oura_post_raw_domain_docs_dropped",
      requestId: "3237605a-ceb7-44bc-958e-be8954b9e939",
      domain: "daily_stress",
      rejectedItemCount: 1,
    },
    {
      operation: "oura_post_raw_domain_extracted",
      requestId: "3237605a-ceb7-44bc-958e-be8954b9e939",
      domain: "sleep",
      validatedItemCount: 2,
    },
    {
      operation: "oura_post_raw_domain_written",
      requestId: "3237605a-ceb7-44bc-958e-be8954b9e939",
      domain: "sleep",
      writtenCount: 2,
      failedCount: 0,
    },
    {
      operation: "oura_post_raw_domain_write_failed",
      requestId: "3237605a-ceb7-44bc-958e-be8954b9e939",
      domain: "readiness",
      safeErrorCode: "FUNCTION_PERSIST_FAILED",
      failedCount: 1,
      retryable: true,
    },
    {
      operation: "oura_post_raw_metadata_failed",
      requestId: "3237605a-ceb7-44bc-958e-be8954b9e939",
      safeErrorCode: "FUNCTION_PERSIST_FAILED",
      writtenCount: 3,
    },
  ];

  it("every sample event is privacy-safe when captured from logger", () => {
    for (const event of sampleEvents) {
      jest.clearAllMocks();
      logOuraPostRawTelemetry(event);
      const calls = [
        ...(logger.error as jest.Mock).mock.calls,
        ...(logger.warn as jest.Mock).mock.calls,
        ...(logger.info as jest.Mock).mock.calls,
      ];
      expect(calls.length).toBe(1);
      const payload = calls[0]![0] as Record<string, unknown>;
      expect(() => assertOuraTelemetryPrivacy(payload)).not.toThrow();
      expect(JSON.stringify(payload)).not.toContain("uid");
      expect(JSON.stringify(payload)).not.toContain("2026-07-12");
    }
  });

  it("rejects synthetic prohibited keys via assert helper", () => {
    expect(() =>
      assertOuraTelemetryPrivacy({
        operation: "bad",
        uid: "user_SENTINEL_UID",
        day: "2026-07-12",
        latestWakeIso: "2026-07-12T06:00:00Z",
      }),
    ).toThrow(/privacy violation/);
  });
});

describe("sanitizeOuraPostRawRequestId", () => {
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  it("accepts a valid UUID from the producer", () => {
    expect(sanitizeOuraPostRawRequestId(SAFE_REQUEST_ID)).toBe(SAFE_REQUEST_ID);
  });

  it("never uses Pub/Sub messageId-like values as requestId", () => {
    const messageIdLike = "projects/oli/topics/oura.post_raw.v1/messages/1234567890";
    const out = sanitizeOuraPostRawRequestId(messageIdLike);
    expect(out).toMatch(uuidRe);
    expect(out).not.toBe(messageIdLike);
    expect(out).not.toContain("messages");
  });

  it.each([
    ["arbitrary text", "not-a-uuid"],
    ["email-like", "user_SENTINEL@example.com"],
    ["date-like", "2026-07-12"],
    ["url-like", "https://evil.example/x"],
    ["bearer-token-like", "Bearer aaa.bbb.ccc"],
    ["idempotency-key-like", "Idempotency-Key-value-xyz"],
    ["uid-like", "uid_SENTINEL"],
    ["oversized", "a".repeat(64)],
  ])("replaces %s with a server UUID", (_label, input) => {
    const out = sanitizeOuraPostRawRequestId(input);
    expect(out).toMatch(uuidRe);
    expect(out).not.toContain("SENTINEL");
  });
});
