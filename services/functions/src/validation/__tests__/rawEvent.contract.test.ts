// services/functions/src/validation/__tests__/rawEvent.contract.test.ts

import { describe, it, expect } from "@jest/globals";
import type { RawEvent } from "../../types/health";
import { parseRawEvent } from "../rawEvent";
import { mapRawEventToCanonical } from "../../normalization/mapRawEventToCanonical";

describe("RawEvent contract (API ⇄ Firestore ⇄ Functions)", () => {
  it("accepts the canonical RawEvent envelope and normalizes it", () => {
    const raw: RawEvent = {
      id: "raw-1",
      userId: "user-1",
      sourceId: "manual",
      sourceType: "manual",
      provider: "manual",
      kind: "weight",
      receivedAt: "2025-01-02T03:04:05.000Z",
      observedAt: "2025-01-02T03:00:00.000Z",
      payload: {
        time: "2025-01-02T03:00:00.000Z",
        day: "2025-01-01",
        timezone: "America/New_York",
        weightKg: 80,
      },
      schemaVersion: 1,
    };

    const parsed = parseRawEvent(raw);
    expect(parsed.ok).toBe(true);

    if (!parsed.ok) {
      throw new Error("RawEvent should have parsed successfully");
    }

    const mapped = mapRawEventToCanonical(parsed.value);
    expect(mapped.ok).toBe(true);

    if (!mapped.ok) {
      throw new Error("RawEvent should have normalized successfully");
    }

    expect(mapped.canonical.kind).toBe("weight");
    expect(mapped.canonical.userId).toBe("user-1");
    expect(mapped.canonical.schemaVersion).toBe(1);
  });

  it("rejects non-ISO timestamps", () => {
    const bad = {
      id: "raw-1",
      userId: "user-1",
      sourceId: "manual",
      sourceType: "manual",
      provider: "manual",
      kind: "weight",
      receivedAt: "not-a-date",
      observedAt: "also-not-a-date",
      payload: {},
      schemaVersion: 1,
    };

    const parsed = parseRawEvent(bad);
    expect(parsed.ok).toBe(false);
  });
});
