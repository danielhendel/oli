import {
  buildManualBodyFatPercentPayload,
  buildManualLeanBodyMassPayload,
  buildManualWaistCircumferencePayload,
  cmToInches,
  inchesToCm,
  manualBodyCompositionIdempotencyKey,
  WHO_MIDPOINT_PROTOCOL_ID,
  WHO_MIDPOINT_PROTOCOL_VERSION,
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

  it("builds a waist-only payload with WHO midpoint protocol", () => {
    const payload = buildManualWaistCircumferencePayload({
      time: "2026-09-20T12:00:00.000Z",
      timezone: "America/New_York",
      waistCircumferenceCm: 82.5,
    });
    expect(payload).toEqual({
      time: "2026-09-20T12:00:00.000Z",
      timezone: "America/New_York",
      waistCircumferenceCm: 82.5,
      protocolId: WHO_MIDPOINT_PROTOCOL_ID,
      protocolVersion: WHO_MIDPOINT_PROTOCOL_VERSION,
    });
    expect(payload.protocolId).toBe("who_midpoint_v1");
    expect(payload.protocolVersion).toBe(1);
    expect(payload).not.toHaveProperty("bodyFatPercent");
    expect(payload).not.toHaveProperty("leanBodyMassKg");
  });

  it("converts inches to cm and back (1 in = 2.54 cm)", () => {
    expect(inchesToCm(1)).toBe(2.54);
    expect(inchesToCm(32)).toBeCloseTo(81.28, 4);
    expect(cmToInches(2.54)).toBe(1);
    expect(cmToInches(81.28)).toBeCloseTo(32, 4);
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

  it("idempotency key includes waist metric and value", () => {
    const waist = buildManualWaistCircumferencePayload({
      time: "2026-09-20T12:00:00.000Z",
      timezone: "UTC",
      waistCircumferenceCm: 80,
    });
    const key = manualBodyCompositionIdempotencyKey(waist, "waistCircumferenceCm");
    expect(key).toContain("waistCircumferenceCm");
    expect(key).toContain("80");
    expect(key).toBe(
      manualBodyCompositionIdempotencyKey(waist, "waistCircumferenceCm"),
    );
    const bf = buildManualBodyFatPercentPayload({
      time: "2026-09-20T12:00:00.000Z",
      timezone: "UTC",
      bodyFatPercent: 18.5,
    });
    expect(key).not.toBe(manualBodyCompositionIdempotencyKey(bf, "bodyFatPercent"));
  });
});
