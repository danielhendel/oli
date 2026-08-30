import { mapDeleteApiFailure } from "../mapDeleteError";

describe("mapDeleteApiFailure", () => {
  it("maps REAUTH_REQUIRED without exposing raw codes to the message", () => {
    const result = mapDeleteApiFailure({
      ok: false,
      status: 401,
      kind: "http",
      error: "REAUTH_REQUIRED",
      requestId: "r1",
      json: {
        ok: false,
        error: { code: "REAUTH_REQUIRED", message: "Recent authentication is required." },
      },
    });
    expect(result.kind).toBe("reauth_required");
    expect(result.message.toLowerCase()).not.toContain("firebase");
    expect(result.message).not.toContain("REAUTH_REQUIRED");
  });

  it("maps network failures", () => {
    const result = mapDeleteApiFailure({
      ok: false,
      status: 0,
      kind: "network",
      error: "network",
      requestId: null,
    });
    expect(result.kind).toBe("network");
    expect(result.retryable).toBe(true);
  });
});
