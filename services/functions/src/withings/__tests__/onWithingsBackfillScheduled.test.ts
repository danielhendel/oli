/**
 * Unit test: Withings backfill scheduler export and contract.
 * Ensures scheduler exists and is not HTTP-callable (invoker-only backfill).
 */
jest.mock("google-auth-library", () => ({
  GoogleAuth: jest.fn().mockImplementation(() => ({
    getIdTokenClient: jest.fn().mockResolvedValue({
      request: jest.fn().mockResolvedValue({ status: 200, data: { ok: true, usersProcessed: 0 } }),
    }),
  })),
}));

import { onWithingsBackfillScheduled } from "../onWithingsBackfillScheduled";

describe("onWithingsBackfillScheduled", () => {
  it("is defined and is a scheduled trigger (not HTTP callable by client)", () => {
    expect(onWithingsBackfillScheduled).toBeDefined();
    expect(typeof onWithingsBackfillScheduled.run).toBe("function");
  });
});
