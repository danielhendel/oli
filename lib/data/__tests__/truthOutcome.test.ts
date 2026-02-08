import { truthOutcomeFromApiResult } from "../truthOutcome";

describe("truthOutcomeFromApiResult", () => {
  it("returns ready for ok results", () => {
    const res = { ok: true as const, status: 200, requestId: "r1", json: { a: 1 } };
    expect(truthOutcomeFromApiResult(res)).toEqual({ status: "ready", data: { a: 1 } });
  });

  it("returns missing for HTTP 404", () => {
    const res = {
      ok: false as const,
      status: 404,
      kind: "http" as const,
      error: "HTTP 404",
      requestId: "r2",
    };
    expect(truthOutcomeFromApiResult(res)).toEqual({ status: "missing" });
  });

  it("returns error for non-404 failures", () => {
    const res = {
      ok: false as const,
      status: 500,
      kind: "http" as const,
      error: "HTTP 500",
      requestId: "r3",
    };
    expect(truthOutcomeFromApiResult(res)).toEqual({ status: "error", error: "HTTP 500", requestId: "r3" });
  });

  it("returns error for contract (schema) failures (fail-closed)", () => {
    const res = {
      ok: false as const,
      status: 200,
      kind: "contract" as const,
      error: "Invalid response shape",
      requestId: "r4",
      json: { issues: [{ path: ["day"], message: "Required" }] },
    };
    expect(truthOutcomeFromApiResult(res)).toEqual({
      status: "error",
      error: "Invalid response shape",
      requestId: "r4",
    });
  });
});
