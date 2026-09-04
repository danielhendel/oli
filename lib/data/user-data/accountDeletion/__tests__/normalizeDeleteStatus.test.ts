import { describe, expect, it } from "@jest/globals";

import {
  isDeletePendingStale,
  normalizeDeleteStatus,
} from "../normalizeDeleteStatus";

describe("normalizeDeleteStatus", () => {
  it("maps queued to consumer queued", () => {
    const result = normalizeDeleteStatus({
      backendStatus: "queued",
      requestedAt: new Date().toISOString(),
      completedAt: null,
    });
    expect(result.status).toBe("queued");
    expect(result.retryable).toBe(false);
  });

  it("maps completed to accepted", () => {
    const result = normalizeDeleteStatus({
      backendStatus: "completed",
      requestedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    });
    expect(result.status).toBe("accepted");
  });

  it("marks stale pending as failed", () => {
    const old = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    expect(
      isDeletePendingStale({ requestedAt: old, now: new Date() }),
    ).toBe(true);
    const result = normalizeDeleteStatus({
      backendStatus: "queued",
      requestedAt: old,
      completedAt: null,
      now: new Date(),
    });
    expect(result.status).toBe("failed");
    expect(result.failureCategory).toBe("stale_pending");
  });
});
