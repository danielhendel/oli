/**
 * Unit tests: server recent-auth bound for account deletion (ADR v1).
 */

import { DELETE_RECENT_AUTH_MAX_AGE_SECONDS } from "@oli/contracts";

import { checkRecentAuthForDeletion } from "../recentAuthForDeletion";

describe("checkRecentAuthForDeletion", () => {
  const now = 1_700_000_000;

  it("accepts a recent auth_time", () => {
    const result = checkRecentAuthForDeletion(now - 60, now);
    expect(result).toEqual({ ok: true });
  });

  it("accepts auth_time at the exact bound", () => {
    const result = checkRecentAuthForDeletion(now - DELETE_RECENT_AUTH_MAX_AGE_SECONDS, now);
    expect(result).toEqual({ ok: true });
  });

  it("rejects a stale auth_time", () => {
    const result = checkRecentAuthForDeletion(now - DELETE_RECENT_AUTH_MAX_AGE_SECONDS - 1, now);
    expect(result).toEqual({ ok: false, reason: "stale_auth_time" });
  });

  it("rejects missing auth_time", () => {
    expect(checkRecentAuthForDeletion(undefined, now)).toEqual({
      ok: false,
      reason: "missing_auth_time",
    });
    expect(checkRecentAuthForDeletion(Number.NaN, now)).toEqual({
      ok: false,
      reason: "missing_auth_time",
    });
  });

  it("rejects future auth_time as stale", () => {
    const result = checkRecentAuthForDeletion(now + 30, now);
    expect(result).toEqual({ ok: false, reason: "stale_auth_time" });
  });
});
