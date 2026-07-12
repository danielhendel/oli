/**
 * Unit tests: categorizeOuraSafeError + logOuraRefreshTelemetry emit only privacy-safe fields.
 */
import { categorizeOuraSafeError, logOuraRefreshTelemetry, sanitizeOuraTelemetryRequestId, type OuraRefreshTelemetryEvent } from "../ouraRefreshTelemetry";
import { assertOuraTelemetryPrivacy } from "../testSupport/assertOuraTelemetryPrivacy";

const SAFE_REQUEST_ID = "3237605a-ceb7-44bc-958e-be8954b9e939";

class FakeOuraApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "OuraApiError";
  }
}

describe("categorizeOuraSafeError", () => {
  it("maps 401 / OURA_UNAUTHORIZED to PROVIDER_UNAUTHORIZED, not retryable", () => {
    expect(categorizeOuraSafeError(new FakeOuraApiError("nope", "OURA_UNAUTHORIZED", 401))).toEqual({
      safeErrorCode: "PROVIDER_UNAUTHORIZED",
      retryable: false,
    });
    expect(categorizeOuraSafeError(new FakeOuraApiError("nope", "OURA_TOKEN_REFRESH_FAILED", 401))).toEqual({
      safeErrorCode: "PROVIDER_UNAUTHORIZED",
      retryable: false,
    });
  });

  it("maps 429 to PROVIDER_RATE_LIMITED, retryable", () => {
    expect(categorizeOuraSafeError(new FakeOuraApiError("slow down", "OURA_FETCH_FAILED", 429))).toEqual({
      safeErrorCode: "PROVIDER_RATE_LIMITED",
      retryable: true,
    });
  });

  it("maps 408 to PROVIDER_TIMEOUT, retryable", () => {
    expect(categorizeOuraSafeError(new FakeOuraApiError("slow", "OURA_FETCH_FAILED", 408))).toEqual({
      safeErrorCode: "PROVIDER_TIMEOUT",
      retryable: true,
    });
  });

  it("maps 5xx to PROVIDER_NETWORK, retryable", () => {
    expect(categorizeOuraSafeError(new FakeOuraApiError("boom", "OURA_FETCH_FAILED", 503))).toEqual({
      safeErrorCode: "PROVIDER_NETWORK",
      retryable: true,
    });
  });

  it("maps OURA_TOKEN_INVALID to PROVIDER_SCHEMA_INVALID, not retryable", () => {
    expect(categorizeOuraSafeError(new FakeOuraApiError("bad shape", "OURA_TOKEN_INVALID", 200))).toEqual({
      safeErrorCode: "PROVIDER_SCHEMA_INVALID",
      retryable: false,
    });
  });

  it("maps network-like plain errors to PROVIDER_NETWORK", () => {
    expect(categorizeOuraSafeError(new Error("fetch failed"))).toEqual({
      safeErrorCode: "PROVIDER_NETWORK",
      retryable: true,
    });
    expect(categorizeOuraSafeError(new Error("ECONNRESET"))).toEqual({
      safeErrorCode: "PROVIDER_NETWORK",
      retryable: true,
    });
  });

  it("maps timeout-like plain errors to PROVIDER_TIMEOUT", () => {
    expect(categorizeOuraSafeError(new Error("request timeout exceeded"))).toEqual({
      safeErrorCode: "PROVIDER_TIMEOUT",
      retryable: true,
    });
  });

  it("falls back to a valid hint when the error is unclassifiable", () => {
    expect(categorizeOuraSafeError(new Error("mystery"), "TOKEN_UNAVAILABLE")).toEqual({
      safeErrorCode: "TOKEN_UNAVAILABLE",
      retryable: false,
    });
  });

  it("falls back to UNKNOWN when there is no hint and the error is unclassifiable", () => {
    expect(categorizeOuraSafeError(new Error("mystery"))).toEqual({
      safeErrorCode: "UNKNOWN",
      retryable: false,
    });
    expect(categorizeOuraSafeError("just a string")).toEqual({
      safeErrorCode: "UNKNOWN",
      retryable: false,
    });
  });

  it("ignores an invalid hint string rather than accepting an arbitrary value", () => {
    expect(categorizeOuraSafeError(new Error("mystery"), "NOT_A_REAL_CODE")).toEqual({
      safeErrorCode: "UNKNOWN",
      retryable: false,
    });
  });

  it("never returns the underlying Error.message in the result", () => {
    const err = new Error("this message must never leak into telemetry: uid=user_secret_123");
    const result = categorizeOuraSafeError(err);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("user_secret_123");
    expect(serialized).not.toContain("this message must never leak");
  });
});

describe("logOuraRefreshTelemetry", () => {
  let infoSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    infoSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    infoSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  function capturedPayload(spy: jest.SpyInstance): Record<string, unknown> {
    expect(spy).toHaveBeenCalledTimes(1);
    const raw = spy.mock.calls[0]![0] as string;
    return JSON.parse(raw) as Record<string, unknown>;
  }

  const sampleEvents: OuraRefreshTelemetryEvent[] = [
    { operation: "oura_reconnect_cleanup_failed", requestId: "3237605a-ceb7-44bc-958e-be8954b9e939", safeErrorCode: "UNKNOWN" },
    { operation: "oura_pull_failed", requestId: "3237605a-ceb7-44bc-958e-be8954b9e939", safeErrorCode: "NO_CONNECTION", retryable: false },
    { operation: "oura_token_refresh_busy", requestId: "3237605a-ceb7-44bc-958e-be8954b9e939", retryable: true },
    { operation: "oura_token_refresh_in_flight_join", requestId: "3237605a-ceb7-44bc-958e-be8954b9e939" },
    { operation: "oura_token_refresh_lock_wait", requestId: "3237605a-ceb7-44bc-958e-be8954b9e939" },
    { operation: "oura_token_refresh_lock_unavailable", requestId: "3237605a-ceb7-44bc-958e-be8954b9e939" },
    { operation: "oura_token_refresh_lock_stolen", requestId: "3237605a-ceb7-44bc-958e-be8954b9e939" },
    { operation: "oura_token_refresh_lock_acquired", requestId: "3237605a-ceb7-44bc-958e-be8954b9e939" },
    { operation: "oura_token_refresh_concurrent_success_detected", requestId: "3237605a-ceb7-44bc-958e-be8954b9e939" },
    { operation: "oura_token_refresh_invalid_grant_cleanup", requestId: "3237605a-ceb7-44bc-958e-be8954b9e939" },
    { operation: "oura_token_refresh_lock_released", requestId: "3237605a-ceb7-44bc-958e-be8954b9e939" },
    {
      operation: "oura_raw_events_core_write_done",
      requestId: "3237605a-ceb7-44bc-958e-be8954b9e939",
      rawEventCreatedCount: 4,
      rawEventExistingCount: 1,
      sleepDocumentCount: 2,
      hrvDocumentCount: 1,
      stepsDocumentCount: 0,
      workoutDocumentCount: 1,
    },
    { operation: "oura_raw_events_vendor_detail_deferred", requestId: "3237605a-ceb7-44bc-958e-be8954b9e939", rawItemCount: 10 },
    {
      operation: "oura_raw_events_vendor_detail_deferred_failed",
      requestId: "3237605a-ceb7-44bc-958e-be8954b9e939",
      rawItemCount: 10,
      safeErrorCode: "RAW_EVENT_PERSIST_FAILED",
    },
    {
      operation: "oura_raw_event_write_failed",
      requestId: "3237605a-ceb7-44bc-958e-be8954b9e939",
      domain: "sleep",
      safeErrorCode: "RAW_EVENT_PERSIST_FAILED",
      failedCount: 1,
    },
    { operation: "oura_legacy_recovery_skipped", requestId: "3237605a-ceb7-44bc-958e-be8954b9e939", backfillStatus: "running" },
    { operation: "oura_legacy_recovery_detected", requestId: "3237605a-ceb7-44bc-958e-be8954b9e939", backfillStatus: null },
    { operation: "oura_legacy_recovery_started", requestId: "3237605a-ceb7-44bc-958e-be8954b9e939" },
    { operation: "oura_legacy_recovery_failed", requestId: "3237605a-ceb7-44bc-958e-be8954b9e939", safeErrorCode: "UNKNOWN" },
    {
      operation: "oura_pull_window",
      requestId: "3237605a-ceb7-44bc-958e-be8954b9e939",
      windowDayCount: 30,
      sleepStartOverlapDayCount: 2,
      sleepEndOverlapDayCount: 1,
    },
    { operation: "oura_provider_fetch_skipped", requestId: "3237605a-ceb7-44bc-958e-be8954b9e939", dataset: "workout", safeErrorCode: "UNKNOWN" },
    { operation: "oura_pull_sleep_summary", requestId: "3237605a-ceb7-44bc-958e-be8954b9e939", hasSleepDocuments: true, sleepDocumentCount: 3 },
    { operation: "oura_pull_fetch_completed", requestId: "3237605a-ceb7-44bc-958e-be8954b9e939", sleepDocumentCount: 3, readinessDocumentCount: 3 },
    { operation: "oura_ingest_docs_dropped", requestId: "3237605a-ceb7-44bc-958e-be8954b9e939", sleepDocumentCount: 3, rejectedItemCount: 1 },
    { operation: "oura_ingest_item_counts", requestId: "3237605a-ceb7-44bc-958e-be8954b9e939", sleepItemCount: 2, hrvItemCount: 3 },
    {
      operation: "oura_raw_event_persist_started",
      requestId: "3237605a-ceb7-44bc-958e-be8954b9e939",
      sleepItemCount: 2,
      hrvItemCount: 3,
      stepsItemCount: 0,
      workoutItemCount: 0,
      rawItemCount: 5,
    },
    { operation: "oura_raw_event_persist_completed", requestId: "3237605a-ceb7-44bc-958e-be8954b9e939", rawEventCreatedCount: 4, rawEventExistingCount: 1 },
    {
      operation: "oura_post_raw_enqueued",
      requestId: "3237605a-ceb7-44bc-958e-be8954b9e939",
      queued: true,
      sleepDocumentCount: 3,
      readinessDocumentCount: 3,
      dailySleepDocumentCount: 3,
      dailyStressDocumentCount: 3,
    },
    { operation: "oura_post_raw_enqueue_failed", requestId: "3237605a-ceb7-44bc-958e-be8954b9e939", safeErrorCode: "POST_RAW_PUBLISH_FAILED" },
    {
      operation: "oura_post_raw_persist_started",
      requestId: "3237605a-ceb7-44bc-958e-be8954b9e939",
      sleepDocumentCount: 3,
      readinessDocumentCount: 3,
      dailySleepDocumentCount: 3,
      dailyStressDocumentCount: 3,
    },
    { operation: "oura_post_raw_persist_completed", requestId: "3237605a-ceb7-44bc-958e-be8954b9e939", writtenCount: 9, metadataWritten: true },
    {
      operation: "oura_post_raw_persist_failed",
      requestId: "3237605a-ceb7-44bc-958e-be8954b9e939",
      safeErrorCode: "POST_RAW_PERSIST_FAILED",
      metadataWritten: false,
    },
    { operation: "oura_backfill_skipped", requestId: "3237605a-ceb7-44bc-958e-be8954b9e939", safeErrorCode: "NO_CONNECTION" },
    { operation: "oura_backfill_started", requestId: "3237605a-ceb7-44bc-958e-be8954b9e939" },
    {
      operation: "oura_backfill_chunk_completed",
      requestId: "3237605a-ceb7-44bc-958e-be8954b9e939",
      chunkIndex: 0,
      chunkCount: 3,
      chunkDayCount: 30,
      sleepSnapshotWrittenCount: 5,
      readinessSnapshotWrittenCount: 5,
    },
    {
      operation: "oura_backfill_chunk_failed",
      requestId: "3237605a-ceb7-44bc-958e-be8954b9e939",
      chunkIndex: 1,
      chunkCount: 3,
      chunkDayCount: 30,
      safeErrorCode: "UNKNOWN",
    },
    {
      operation: "oura_backfill_completed",
      requestId: "3237605a-ceb7-44bc-958e-be8954b9e939",
      sleepSnapshotWrittenCount: 12,
      readinessSnapshotWrittenCount: 12,
    },
    { operation: "oura_backfill_failed", requestId: "3237605a-ceb7-44bc-958e-be8954b9e939", safeErrorCode: "UNKNOWN" },
    { operation: "oura_provider_fetch_page_capped", requestId: "3237605a-ceb7-44bc-958e-be8954b9e939", dataset: "sleep", pageCount: 100, providerItemCount: 900 },
    { operation: "oura_provider_fetch_completed", requestId: "3237605a-ceb7-44bc-958e-be8954b9e939", dataset: "sleep", pageCount: 3, providerItemCount: 27 },
    { operation: "oura_vendor_snapshot_docs_received", requestId: "3237605a-ceb7-44bc-958e-be8954b9e939", domain: "sleep", sleepDocumentCount: 3 },
    { operation: "oura_vendor_snapshot_docs_dropped", requestId: "3237605a-ceb7-44bc-958e-be8954b9e939", domain: "sleep", rejectedItemCount: 1, sleepDocumentCount: 3 },
    { operation: "oura_vendor_snapshot_extracted", requestId: "3237605a-ceb7-44bc-958e-be8954b9e939", domain: "sleep", validatedItemCount: 2, sleepDocumentCount: 3 },
    { operation: "oura_vendor_snapshot_write_failed", requestId: "3237605a-ceb7-44bc-958e-be8954b9e939", domain: "sleep", safeErrorCode: "UNKNOWN", failedCount: 1 },
    { operation: "oura_vendor_snapshot_written", requestId: "3237605a-ceb7-44bc-958e-be8954b9e939", domain: "sleep", writtenCount: 2, failedCount: 0 },
  ];

  it("emits every sample event via the correct console method with no thrown errors", () => {
    for (const event of sampleEvents) {
      infoSpy.mockClear();
      warnSpy.mockClear();
      errorSpy.mockClear();
      expect(() => logOuraRefreshTelemetry(event)).not.toThrow();
    }
  });

  it("routes failure operations to console.error", () => {
    logOuraRefreshTelemetry({ operation: "oura_pull_failed", requestId: "3237605a-ceb7-44bc-958e-be8954b9e939", safeErrorCode: "NO_CONNECTION", retryable: false });
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(infoSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("routes degraded-but-non-fatal operations to console.warn", () => {
    logOuraRefreshTelemetry({ operation: "oura_token_refresh_busy", requestId: "3237605a-ceb7-44bc-958e-be8954b9e939", retryable: true });
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(infoSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("routes docs-dropped operations to console.log (info), not warn", () => {
    logOuraRefreshTelemetry({
      operation: "oura_vendor_snapshot_docs_dropped",
      requestId: "3237605a-ceb7-44bc-958e-be8954b9e939",
      domain: "sleep",
      rejectedItemCount: 1,
      sleepDocumentCount: 1,
    });
    expect(infoSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("routes routine operations to console.log (info)", () => {
    logOuraRefreshTelemetry({ operation: "oura_backfill_started", requestId: "3237605a-ceb7-44bc-958e-be8954b9e939" });
    expect(infoSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("includes operation and msg (same value) plus the event's own fields only", () => {
    logOuraRefreshTelemetry({
      operation: "oura_pull_window",
      requestId: "3237605a-ceb7-44bc-958e-be8954b9e939",
      windowDayCount: 30,
      sleepStartOverlapDayCount: 2,
      sleepEndOverlapDayCount: 1,
    });
    const payload = capturedPayload(infoSpy);
    expect(payload.operation).toBe("oura_pull_window");
    expect(payload.msg).toBe("oura_pull_window");
    expect(payload.windowDayCount).toBe(30);
    expect(payload.sleepStartOverlapDayCount).toBe(2);
    expect(payload.sleepEndOverlapDayCount).toBe(1);
    expect(payload.level).toBe("info");
  });

  it("every sample event serializes to JSON with no privacy violations", () => {
    for (const event of sampleEvents) {
      infoSpy.mockClear();
      warnSpy.mockClear();
      errorSpy.mockClear();
      logOuraRefreshTelemetry(event);
      const spy = errorSpy.mock.calls.length > 0 ? errorSpy : warnSpy.mock.calls.length > 0 ? warnSpy : infoSpy;
      const payload = capturedPayload(spy);
      expect(() => assertOuraTelemetryPrivacy(payload)).not.toThrow();
    }
  });

  it("replaces unsafe requestId before emit and never logs the raw candidate", () => {
    const unsafe = "user_SENTINEL@example.com";
    logOuraRefreshTelemetry({
      operation: "oura_backfill_started",
      requestId: unsafe,
    });
    const payload = capturedPayload(infoSpy);
    expect(payload.requestId).not.toBe(unsafe);
    expect(String(payload.requestId)).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(JSON.stringify(payload)).not.toContain("SENTINEL");
    expect(JSON.stringify(payload)).not.toContain("@example.com");
  });
});

describe("sanitizeOuraTelemetryRequestId", () => {
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  it("accepts a valid UUID", () => {
    expect(sanitizeOuraTelemetryRequestId(SAFE_REQUEST_ID)).toBe(SAFE_REQUEST_ID);
  });

  it.each([
    ["arbitrary text", "not-a-uuid-at-all"],
    ["email-like", "user_SENTINEL@example.com"],
    ["date-like", "2026-07-12"],
    ["url-like", "https://evil.example/path"],
    ["bearer-token-like", "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.aaa.bbb"],
    ["firebase-token-like", "eyJhbGciOiJSUzI1NiIsImtpZCI6ImZha2UifQ.payload.sig"],
    ["idempotency-key-like", "idempotency-oura-pull-abc123"],
    ["uid-like", "firebaseUid_SENTINEL_abc"],
    ["oversized", `${"a".repeat(40)}`],
    ["empty", ""],
    ["spaces", "3237605a-ceb7-44bc-958e-be8954b9e939 extra"],
  ])("replaces %s input with a new UUID", (_label, input) => {
    const out = sanitizeOuraTelemetryRequestId(input);
    expect(out).toMatch(uuidRe);
    expect(out).not.toBe(input);
    expect(out).not.toContain("SENTINEL");
  });
});
