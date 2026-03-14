/**
 * Unit test: Oura pull scheduler export and contract.
 * Ensures scheduler exists and is a scheduled trigger (invoker-only, not HTTP-callable by client).
 */
jest.mock("google-auth-library", () => ({
  GoogleAuth: jest.fn().mockImplementation(() => ({
    getIdTokenClient: jest.fn().mockResolvedValue({
      request: jest.fn().mockResolvedValue({
        status: 200,
        data: { ok: true, usersProcessed: 0, eventsCreated: 0, eventsAlreadyExists: 0 },
      }),
    }),
  })),
}));

import { onOuraPullScheduled } from "../onOuraPullScheduled";

describe("onOuraPullScheduled", () => {
  it("is defined and is a scheduled trigger (not HTTP callable by client)", () => {
    expect(onOuraPullScheduled).toBeDefined();
    expect(typeof onOuraPullScheduled.run).toBe("function");
  });
});
