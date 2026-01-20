// services/functions/src/normalization/__tests__/mapRawEventToCanonical.test.ts
import { describe, it, expect } from "@jest/globals";
import type { RawEvent, CanonicalEvent } from "../../types/health";
import { mapRawEventToCanonical } from "../mapRawEventToCanonical";

const baseRawEvent: Omit<RawEvent, "id" | "payload" | "kind" | "provider"> = {
  userId: "user_123",
  sourceId: "source_manual_1",
  sourceType: "manual",
  receivedAt: "2025-01-01T12:00:00.000Z",
  observedAt: "2025-01-01T06:00:00.000Z",
  schemaVersion: 1,
};

describe("mapRawEventToCanonical", () => {
  it("maps manual sleep payload to SleepCanonicalEvent", () => {
    const raw: RawEvent = {
      ...baseRawEvent,
      id: "raw_sleep_1",
      provider: "manual",
      kind: "sleep",
      payload: {
        start: "2025-01-01T22:00:00.000Z",
        end: "2025-01-02T06:00:00.000Z",
        day: "2025-01-01",
        timezone: "America/New_York",
        totalMinutes: 480,
        efficiency: 0.9,
        latencyMinutes: 15,
        awakenings: 2,
        isMainSleep: true,
      } as unknown,
    };

    const result = mapRawEventToCanonical(raw);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected mapping success");

    const canonical = result.canonical;
    expect(canonical.id).toBe(raw.id);
    expect(canonical.userId).toBe(raw.userId);
    expect(canonical.sourceId).toBe(raw.sourceId);
    expect(canonical.kind).toBe("sleep");
    expect(canonical.start).toBe("2025-01-01T22:00:00.000Z");
    expect(canonical.end).toBe("2025-01-02T06:00:00.000Z");
    expect(canonical.day).toBe("2025-01-01");
    expect(canonical.timezone).toBe("America/New_York");
    expect(canonical.createdAt).toBe(raw.receivedAt);
    expect(canonical.updatedAt).toBe(raw.receivedAt);
    expect(canonical.schemaVersion).toBe(1);

    if (canonical.kind !== "sleep") throw new Error("Expected sleep kind");
    const sleep = canonical as Extract<CanonicalEvent, { kind: "sleep" }>;
    expect(sleep.totalMinutes).toBe(480);
    expect(sleep.isMainSleep).toBe(true);
  });

  it("maps manual steps payload to StepsCanonicalEvent", () => {
    const raw: RawEvent = {
      ...baseRawEvent,
      id: "raw_steps_1",
      provider: "manual",
      kind: "steps",
      payload: {
        start: "2025-01-01T08:00:00.000Z",
        end: "2025-01-01T21:00:00.000Z",
        day: "2025-01-01",
        timezone: "America/New_York",
        steps: 12000,
        distanceKm: 8.4,
        moveMinutes: 90,
      } as unknown,
    };

    const result = mapRawEventToCanonical(raw);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected mapping success");

    const canonical = result.canonical;
    expect(canonical.kind).toBe("steps");
    if (canonical.kind !== "steps") throw new Error("Expected steps kind");

    const stepsEvent = canonical as Extract<CanonicalEvent, { kind: "steps" }>;
    expect(stepsEvent.steps).toBe(12000);
    expect(stepsEvent.distanceKm).toBe(8.4);
    expect(stepsEvent.moveMinutes).toBe(90);
  });

  it("maps manual weight payload to WeightCanonicalEvent", () => {
    const raw: RawEvent = {
      ...baseRawEvent,
      id: "raw_weight_1",
      provider: "manual",
      kind: "weight",
      payload: {
        time: "2025-01-01T06:00:00.000Z",
        day: "2025-01-01",
        timezone: "America/New_York",
        weightKg: 73.482,
        bodyFatPercent: null,
      } as unknown,
    };

    const result = mapRawEventToCanonical(raw);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected mapping success");

    const canonical = result.canonical;
    expect(canonical.kind).toBe("weight");
    if (canonical.kind !== "weight") throw new Error("Expected weight kind");

    const weightEvent = canonical as Extract<CanonicalEvent, { kind: "weight" }>;
    expect(weightEvent.weightKg).toBe(73.482);
    // bodyFatPercent is optional/nullable depending on your canonical type; accept null/undefined.
    expect("bodyFatPercent" in weightEvent ? weightEvent.bodyFatPercent : undefined).toBeNull();
  });

  it("returns failure for unsupported provider", () => {
    const raw: RawEvent = {
      ...baseRawEvent,
      id: "raw_oura_1",
      provider: "oura",
      kind: "sleep",
      payload: {} as unknown,
    };

    const result = mapRawEventToCanonical(raw);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected mapping failure");
    expect(result.reason).toBe("UNSUPPORTED_PROVIDER");
  });

  it("returns failure for malformed manual payload", () => {
    const raw: RawEvent = {
      ...baseRawEvent,
      id: "raw_bad_1",
      provider: "manual",
      kind: "sleep",
      payload: {
        // missing start/end/day/timezone/totalMinutes
        isMainSleep: true,
      } as unknown,
    };

    const result = mapRawEventToCanonical(raw);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected mapping failure");
    expect(result.reason).toBe("MALFORMED_PAYLOAD");
  });

  it("treats upload.file as memory-only (no canonical output)", () => {
    const raw: RawEvent = {
      ...baseRawEvent,
      id: "raw_upload_1",
      provider: "manual",
      kind: "upload.file",
      payload: {
        storagePath: "users/user_123/uploads/abc.pdf",
        fileHash: "sha256:deadbeef",
        mimeType: "application/pdf",
        originalFilename: "labs.pdf",
      } as unknown,
    };

    const result = mapRawEventToCanonical(raw);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected mapping failure (no-op)");
    expect(result.reason).toBe("UNSUPPORTED_KIND");
    expect(result.details).toEqual(
      expect.objectContaining({
        kind: "upload.file",
        memoryOnly: true,
        rawEventId: "raw_upload_1",
      })
    );
  });
});
