import { describe, expect, it } from "@jest/globals";

import { EXPORT_PENDING_MAX_AGE_MS, EXPORT_PENDING_STARTED_MAX_AGE_MS } from "@oli/contracts";
import {
  isPendingStale,
  normalizeExportStatus,
} from "@/lib/data/user-data/export/normalizeExportStatus";

describe("normalizeExportStatus", () => {
  const now = new Date("2026-08-24T12:00:00.000Z");

  it("maps queued to pending when recent", () => {
    const result = normalizeExportStatus({
      backendStatus: "queued",
      packageAvailable: false,
      requestedAt: "2026-08-24T11:00:00.000Z",
      completedAt: null,
      now,
    });
    expect(result.status).toBe("pending");
    expect(result.retryable).toBe(false);
  });

  it("maps ancient queued to failed stale_pending", () => {
    const result = normalizeExportStatus({
      backendStatus: "queued",
      packageAvailable: false,
      requestedAt: "2026-01-25T16:47:00.000Z",
      completedAt: null,
      now,
    });
    expect(result.status).toBe("failed");
    expect(result.failureCategory).toBe("stale_pending");
    expect(result.retryable).toBe(true);
  });

  it("maps ancient in_progress to failed stale_pending", () => {
    const result = normalizeExportStatus({
      backendStatus: "in_progress",
      packageAvailable: false,
      requestedAt: "2026-01-25T16:47:00.000Z",
      startedAt: "2026-01-25T16:48:00.000Z",
      completedAt: null,
      now,
    });
    expect(result.status).toBe("failed");
    expect(result.failureCategory).toBe("stale_pending");
  });

  it("maps started-but-stuck in_progress past started max age to stale", () => {
    const startedAt = new Date(
      now.getTime() - EXPORT_PENDING_STARTED_MAX_AGE_MS - 60_000,
    ).toISOString();
    const result = normalizeExportStatus({
      backendStatus: "in_progress",
      packageAvailable: false,
      requestedAt: startedAt,
      startedAt,
      completedAt: null,
      now,
    });
    expect(result.status).toBe("failed");
    expect(result.failureCategory).toBe("stale_pending");
  });

  it("keeps recently started in_progress as pending", () => {
    const startedAt = new Date(now.getTime() - 60_000).toISOString();
    const result = normalizeExportStatus({
      backendStatus: "in_progress",
      packageAvailable: false,
      requestedAt: startedAt,
      startedAt,
      completedAt: null,
      now,
    });
    expect(result.status).toBe("pending");
  });

  it("treats pending without timestamps as stale", () => {
    expect(
      isPendingStale({
        requestedAt: null,
        updatedAt: null,
        startedAt: null,
        now,
      }),
    ).toBe(true);
  });

  it("keeps pending under max age", () => {
    const requestedAt = new Date(now.getTime() - EXPORT_PENDING_MAX_AGE_MS + 60_000).toISOString();
    expect(
      isPendingStale({
        requestedAt,
        now,
      }),
    ).toBe(false);
  });

  it("maps completed with package to ready", () => {
    const completedAt = "2026-08-22T12:00:00.000Z";
    const result = normalizeExportStatus({
      backendStatus: "completed",
      packageAvailable: true,
      requestedAt: completedAt,
      completedAt,
      now,
    });
    expect(result.status).toBe("ready");
    expect(result.expiresAt).not.toBeNull();
  });

  it("maps completed past retention to expired", () => {
    const completedAt = "2026-08-01T12:00:00.000Z";
    const result = normalizeExportStatus({
      backendStatus: "completed",
      packageAvailable: true,
      requestedAt: completedAt,
      completedAt,
      now,
    });
    expect(result.status).toBe("expired");
    expect(result.retryable).toBe(true);
  });

  it("maps failed to failed retryable", () => {
    const result = normalizeExportStatus({
      backendStatus: "failed",
      packageAvailable: false,
      requestedAt: now.toISOString(),
      completedAt: null,
      now,
    });
    expect(result.status).toBe("failed");
    expect(result.retryable).toBe(true);
  });
});
