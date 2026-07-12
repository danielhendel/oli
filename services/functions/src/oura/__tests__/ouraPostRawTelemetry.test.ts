/**
 * Unit tests: categorizeOuraPostRawSafeError + logOuraPostRawTelemetry emit only
 * privacy-safe fields. Logger output is captured and never printed.
 */
import { logger } from "firebase-functions";
import {
  categorizeOuraPostRawSafeError,
  logOuraPostRawTelemetry,
  type OuraPostRawTelemetryEvent,
} from "../ouraPostRawTelemetry";
import { assertOuraTelemetryPrivacy } from "../../../../api/src/lib/testSupport/assertOuraTelemetryPrivacy";

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
      requestId: "req_1",
      sleepDocumentCount: 2,
      readinessDocumentCount: 2,
      dailySleepDocumentCount: 1,
      dailyStressDocumentCount: 1,
    },
    {
      operation: "oura_post_raw_completed",
      requestId: "req_1",
      writtenCount: 5,
      sleepDocumentCount: 2,
      readinessDocumentCount: 2,
      dailyStressDocumentCount: 1,
      sleepNightDocumentCount: 2,
      metadataWritten: true,
    },
    { operation: "oura_post_raw_rejected", requestId: "req_1", safeErrorCode: "FUNCTION_PAYLOAD_INVALID" },
    {
      operation: "oura_post_raw_failed",
      requestId: "req_1",
      safeErrorCode: "FUNCTION_PERSIST_FAILED",
      retryable: true,
    },
    {
      operation: "oura_post_raw_domain_docs_received",
      requestId: "req_1",
      domain: "sleep",
      sleepDocumentCount: 2,
      dailySleepDocumentCount: 1,
    },
    {
      operation: "oura_post_raw_domain_docs_dropped",
      requestId: "req_1",
      domain: "daily_stress",
      rejectedItemCount: 1,
    },
    {
      operation: "oura_post_raw_domain_extracted",
      requestId: "req_1",
      domain: "sleep",
      validatedItemCount: 2,
    },
    {
      operation: "oura_post_raw_domain_written",
      requestId: "req_1",
      domain: "sleep",
      writtenCount: 2,
      failedCount: 0,
    },
    {
      operation: "oura_post_raw_domain_write_failed",
      requestId: "req_1",
      domain: "readiness",
      safeErrorCode: "FUNCTION_PERSIST_FAILED",
      failedCount: 1,
      retryable: true,
    },
    {
      operation: "oura_post_raw_metadata_failed",
      requestId: "req_1",
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
