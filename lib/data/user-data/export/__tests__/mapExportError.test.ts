import { describe, expect, it } from "@jest/globals";

import { mapExportApiFailure } from "@/lib/data/user-data/export/mapExportError";

describe("mapExportApiFailure", () => {
  it("maps network failures safely", () => {
    const result = mapExportApiFailure({
      ok: false,
      status: 0,
      kind: "network",
      error: "Network error",
      requestId: null,
    });
    expect(result.message).not.toMatch(/Firebase|auth\/|http:\/\//i);
    expect(result.retryable).toBe(true);
  });

  it("maps unauthorized without raw backend text", () => {
    const result = mapExportApiFailure({
      ok: false,
      status: 401,
      kind: "http",
      error: "raw backend",
      requestId: "rid",
    });
    expect(result.category).toBe("unauthorized");
    expect(result.message).not.toContain("raw backend");
  });

  it("maps expired export", () => {
    const result = mapExportApiFailure({
      ok: false,
      status: 410,
      kind: "http",
      error: "gone",
      requestId: "rid",
      json: { error: { code: "EXPORT_EXPIRED", message: "internal" } },
    });
    expect(result.category).toBe("export_expired");
    expect(result.message).not.toContain("internal");
  });
});
