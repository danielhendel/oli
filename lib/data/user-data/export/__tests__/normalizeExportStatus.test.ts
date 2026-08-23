import { describe, expect, it } from "@jest/globals";

import { normalizeExportStatus } from "@/lib/data/user-data/export/normalizeExportStatus";

describe("normalizeExportStatus", () => {
  const now = new Date("2026-08-23T12:00:00.000Z");

  it("maps queued to pending", () => {
    const result = normalizeExportStatus({
      backendStatus: "queued",
      packageAvailable: false,
      requestedAt: now.toISOString(),
      completedAt: null,
      now,
    });
    expect(result.status).toBe("pending");
    expect(result.retryable).toBe(false);
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
