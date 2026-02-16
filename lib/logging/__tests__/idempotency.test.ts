import { buildIdempotencyKey } from "../idempotency";

describe("idempotency", () => {
  it("is stable and distinct", () => {
    const a = buildIdempotencyKey({ provider: "oura", deviceId: "x1", type: "recovery", ymd: "2025-01-01", startIso: "2025-01-01T00:00:00Z" });
    const b = buildIdempotencyKey({ provider: "oura", deviceId: "x1", type: "recovery", ymd: "2025-01-01", startIso: "2025-01-01T00:00:00Z" });
    const c = buildIdempotencyKey({ provider: "oura", deviceId: "x2", type: "recovery", ymd: "2025-01-01", startIso: "2025-01-01T00:00:00Z" });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});
