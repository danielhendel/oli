import {
  buildManualBodyFatPercentPayload,
  buildManualLeanBodyMassPayload,
  manualBodyCompositionIdempotencyKey,
} from "@/lib/events/manualBodyComposition";

describe("manualBodyComposition", () => {
  it("builds a body-fat-only payload", () => {
    const payload = buildManualBodyFatPercentPayload({
      time: "2026-09-20T12:00:00.000Z",
      timezone: "America/New_York",
      bodyFatPercent: 18.25,
    });
    expect(payload).toEqual({
      time: "2026-09-20T12:00:00.000Z",
      timezone: "America/New_York",
      bodyFatPercent: 18.25,
    });
    expect(payload).not.toHaveProperty("weightKg");
    expect(payload).not.toHaveProperty("leanBodyMassKg");
  });

  it("builds a lean-mass-only payload in kg", () => {
    const payload = buildManualLeanBodyMassPayload({
      time: "2026-09-20T12:00:00.000Z",
      timezone: "UTC",
      leanBodyMassLbs: 135,
    });
    expect(payload.leanBodyMassKg).toBeCloseTo(61.2349, 3);
    expect(payload).not.toHaveProperty("weightKg");
    expect(payload).not.toHaveProperty("bodyFatPercent");
  });

  it("idempotency keys are deterministic per metric", () => {
    const bf = buildManualBodyFatPercentPayload({
      time: "2026-09-20T12:00:00.000Z",
      timezone: "UTC",
      bodyFatPercent: 18.5,
    });
    expect(manualBodyCompositionIdempotencyKey(bf, "bodyFatPercent")).toBe(
      manualBodyCompositionIdempotencyKey(bf, "bodyFatPercent"),
    );
    const lean = buildManualLeanBodyMassPayload({
      time: "2026-09-20T12:00:00.000Z",
      timezone: "UTC",
      leanBodyMassLbs: 135,
    });
    expect(manualBodyCompositionIdempotencyKey(lean, "leanBodyMassKg")).not.toBe(
      manualBodyCompositionIdempotencyKey(bf, "bodyFatPercent"),
    );
  });
});
