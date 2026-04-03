import { describe, it, expect, jest } from "@jest/globals";
import { coalesceAppleHealthBodySamplesForIngest } from "../healthKit";
import { runAppleHealthBodySync } from "../runAppleHealthBodySync";

describe("runAppleHealthBodySync", () => {
  it("maps Apple Health samples into weight raw events", async () => {
    const ingestRawEvent = jest.fn(async () => ({ ok: true as const }));
    const result = await runAppleHealthBodySync(
      {
        token: "t1",
        startDate: "2026-03-01T00:00:00.000Z",
        endDate: "2026-03-31T23:59:59.999Z",
      },
      {
        pullBodyCompositionSamples: async () => ({
          ok: true,
          data: [
            {
              observedAt: "2026-03-30T12:00:00.000Z",
              sourceId: "apple_watch",
              weightKg: 80.4,
              bodyFatPercent: 17.1,
              bmi: 24.2,
              leanBodyMassKg: 66.5,
              restingMetabolicRateKcal: 1780,
            },
          ],
        }),
        ingestRawEvent,
        appleHealthBodyWeightIdempotencyKey: ({ observedAtIso, sourceId }) =>
          `appleHealth:v2:bodyWeight:${observedAtIso}:${sourceId ?? "healthkit"}`,
        appleHealthBodyCompositionIdempotencyKey: ({ observedAtIso, sourceId, metric }) =>
          `appleHealth:v2:bodyComposition:${metric}:${observedAtIso}:${sourceId ?? "healthkit"}`,
        getDeviceTimezone: () => "America/Los_Angeles",
      },
    );

    expect(result.ok).toBe(true);
    expect(ingestRawEvent).toHaveBeenCalledTimes(4);
    const body = ingestRawEvent.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(body.provider).toBe("apple_health");
    expect(body.sourceId).toBe("apple_health");
    expect(body.kind).toBe("weight");
    expect(body.observedAt).toBe("2026-03-30T12:00:00.000Z");
    const payload = body.payload as Record<string, unknown>;
    expect(payload.weightKg).toBe(80.4);
    expect(payload.bodyFatPercent).toBe(17.1);
    const compositionKinds = ingestRawEvent.mock.calls
      .map((c) => c[0] as { kind: string; payload: Record<string, unknown> })
      .filter((c) => c.kind === "body_composition");
    expect(compositionKinds).toHaveLength(3);
    expect(compositionKinds.some((c) => typeof c.payload.bmi === "number")).toBe(true);
    expect(compositionKinds.some((c) => typeof c.payload.leanBodyMassKg === "number")).toBe(true);
    expect(compositionKinds.some((c) => typeof c.payload.restingMetabolicRateKcal === "number")).toBe(true);
  });

  it("same-day coalesced fragmented samples yield one weight row + BMI / lean / RMR composition ingests", async () => {
    const ingestRawEvent = jest.fn(async () => ({ ok: true as const }));
    const fragmented = [
      {
        observedAt: "2026-03-30T12:00:00.000Z",
        sourceId: "apple_watch",
        weightKg: 80.4,
        bodyFatPercent: 17.1,
      },
      { observedAt: "2026-03-30T18:00:00.000Z", sourceId: "apple_watch", bmi: 24.2 },
      { observedAt: "2026-03-30T19:00:00.000Z", sourceId: "apple_watch", leanBodyMassKg: 66.5 },
      {
        observedAt: "2026-03-30T20:00:00.000Z",
        sourceId: "apple_watch",
        restingMetabolicRateKcal: 1780,
      },
    ];
    const result = await runAppleHealthBodySync(
      {
        token: "t1",
        startDate: "2026-03-01T00:00:00.000Z",
        endDate: "2026-03-31T23:59:59.999Z",
      },
      {
        pullBodyCompositionSamples: async () => ({
          ok: true,
          data: coalesceAppleHealthBodySamplesForIngest(fragmented, "America/Los_Angeles"),
        }),
        ingestRawEvent,
        appleHealthBodyWeightIdempotencyKey: ({ observedAtIso, sourceId }) =>
          `appleHealth:v2:bodyWeight:${observedAtIso}:${sourceId ?? "healthkit"}`,
        appleHealthBodyCompositionIdempotencyKey: ({ observedAtIso, sourceId, metric }) =>
          `appleHealth:v2:bodyComposition:${metric}:${observedAtIso}:${sourceId ?? "healthkit"}`,
        getDeviceTimezone: () => "America/Los_Angeles",
      },
    );

    expect(result.ok).toBe(true);
    expect(ingestRawEvent).toHaveBeenCalledTimes(4);
    const weightCall = ingestRawEvent.mock.calls.find(
      (c) => (c[0] as { kind: string }).kind === "weight",
    )?.[0] as { observedAt: string; payload: Record<string, unknown> };
    expect(weightCall.observedAt).toBe("2026-03-30T12:00:00.000Z");
    expect(weightCall.payload.weightKg).toBe(80.4);
    expect(weightCall.payload.bodyFatPercent).toBe(17.1);
  });

  it("omits NaN bodyFatPercent on weight payloads (would fail RawEvent finite())", async () => {
    const ingestRawEvent = jest.fn(async () => ({ ok: true as const }));
    await runAppleHealthBodySync(
      {
        token: "t1",
        startDate: "2026-03-01T00:00:00.000Z",
        endDate: "2026-03-31T23:59:59.999Z",
      },
      {
        pullBodyCompositionSamples: async () => ({
          ok: true,
          data: [
            {
              observedAt: "2026-03-30T12:00:00.000Z",
              sourceId: "apple_watch",
              weightKg: 80,
              bodyFatPercent: Number.NaN,
            },
          ],
        }),
        ingestRawEvent,
        appleHealthBodyWeightIdempotencyKey: ({ observedAtIso, sourceId }) =>
          `appleHealth:v2:bodyWeight:${observedAtIso}:${sourceId ?? "healthkit"}`,
        appleHealthBodyCompositionIdempotencyKey: ({ observedAtIso, sourceId, metric }) =>
          `appleHealth:v2:bodyComposition:${metric}:${observedAtIso}:${sourceId ?? "healthkit"}`,
        getDeviceTimezone: () => "America/Los_Angeles",
      },
    );
    const body = ingestRawEvent.mock.calls[0]?.[0] as { payload: Record<string, unknown> };
    expect(body.payload.weightKg).toBe(80);
    expect(body.payload.bodyFatPercent).toBeUndefined();
  });

  it("returns error when pull fails", async () => {
    const result = await runAppleHealthBodySync(
      {
        token: "t1",
        startDate: "2026-03-01T00:00:00.000Z",
        endDate: "2026-03-31T23:59:59.999Z",
      },
      {
        pullBodyCompositionSamples: async () => ({ ok: false, error: "permissions denied" }),
        ingestRawEvent: async () => ({ ok: true }),
        appleHealthBodyWeightIdempotencyKey: ({ observedAtIso }) => observedAtIso,
        appleHealthBodyCompositionIdempotencyKey: ({ observedAtIso }) => observedAtIso,
        getDeviceTimezone: () => "UTC",
      },
    );
    expect(result).toEqual({ ok: false, error: "permissions denied", requestId: null });
  });

  it("ingests body-fat-only samples via body_composition raw kind", async () => {
    const ingestRawEvent = jest.fn(async () => ({ ok: true as const }));
    const result = await runAppleHealthBodySync(
      {
        token: "t1",
        startDate: "2026-03-01T00:00:00.000Z",
        endDate: "2026-03-31T23:59:59.999Z",
      },
      {
        pullBodyCompositionSamples: async () => ({
          ok: true,
          data: [
            {
              observedAt: "2026-03-30T12:00:00.000Z",
              sourceId: "apple_watch",
              bodyFatPercent: 17.1,
            },
          ],
        }),
        ingestRawEvent,
        appleHealthBodyWeightIdempotencyKey: ({ observedAtIso, sourceId }) =>
          `appleHealth:v2:bodyWeight:${observedAtIso}:${sourceId ?? "healthkit"}`,
        appleHealthBodyCompositionIdempotencyKey: ({ observedAtIso, sourceId, metric }) =>
          `appleHealth:v2:bodyComposition:${metric}:${observedAtIso}:${sourceId ?? "healthkit"}`,
        getDeviceTimezone: () => "America/Los_Angeles",
      },
    );
    expect(result.ok).toBe(true);
    expect(ingestRawEvent).toHaveBeenCalledTimes(1);
    const body = ingestRawEvent.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(body.kind).toBe("body_composition");
    expect((body.payload as Record<string, unknown>).bodyFatPercent).toBe(17.1);
  });
});

