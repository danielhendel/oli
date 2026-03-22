import { describe, it, expect, jest } from "@jest/globals";
import { mergeDistanceIntoExistingAppleHealthWorkoutIfNeeded } from "../mergeAppleHealthWorkoutDistance";
import type { IngestRawEventBody } from "../../types/events";

const baseExisting = {
  schemaVersion: 1 as const,
  id: "appleHealth:v2:workout:k",
  userId: "u1",
  sourceId: "healthkit",
  sourceType: "manual",
  provider: "apple_health",
  kind: "workout" as const,
  receivedAt: "2025-01-01T00:00:00.000Z",
  observedAt: "2025-01-01T10:00:00.000Z",
  payload: {
    start: "2025-01-01T10:00:00.000Z",
    end: "2025-01-01T11:00:00.000Z",
    timezone: "UTC",
    sport: "Running",
    durationMinutes: 60,
  },
};

describe("mergeDistanceIntoExistingAppleHealthWorkoutIfNeeded", () => {
  it("returns false when provider is not apple_health", async () => {
    const u = jest.fn();
    const r = await mergeDistanceIntoExistingAppleHealthWorkoutIfNeeded({
      body: {
        provider: "manual",
        kind: "workout",
        payload: { distanceMeters: 1000 },
      } as IngestRawEventBody,
      existingData: baseExisting,
      update: u,
    });
    expect(r).toBe(false);
    expect(u).not.toHaveBeenCalled();
  });

  it("returns false when existing already has positive distanceMeters", async () => {
    const u = jest.fn();
    const r = await mergeDistanceIntoExistingAppleHealthWorkoutIfNeeded({
      body: {
        provider: "apple_health",
        kind: "workout",
        payload: { distanceMeters: 2000 },
      } as IngestRawEventBody,
      existingData: {
        ...baseExisting,
        payload: { ...baseExisting.payload, distanceMeters: 100 },
      },
      update: u,
    });
    expect(r).toBe(false);
    expect(u).not.toHaveBeenCalled();
  });

  it("merges distanceMeters and calls update when missing", async () => {
    const u = jest.fn(() => Promise.resolve());
    const r = await mergeDistanceIntoExistingAppleHealthWorkoutIfNeeded({
      body: {
        provider: "apple_health",
        kind: "workout",
        payload: { distanceMeters: 1609.344 },
      } as IngestRawEventBody,
      existingData: baseExisting,
      update: u,
    });
    expect(r).toBe(true);
    expect(u).toHaveBeenCalledTimes(1);
    expect(u.mock.calls[0]![0]).toMatchObject({
      ...baseExisting.payload,
      distanceMeters: 1609.344,
    });
  });
});
