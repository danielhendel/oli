import { describe, it, expect } from "@jest/globals";
import { buildAppleHealthBodyMassSampleQueryOptions } from "../healthKit";

describe("buildAppleHealthBodyMassSampleQueryOptions", () => {
  it("requests explicit kg for HealthKit mass queries (native default is lb when unit omitted)", () => {
    expect(
      buildAppleHealthBodyMassSampleQueryOptions({
        startDate: "2026-01-01T00:00:00.000Z",
        endDate: "2026-01-31T23:59:59.999Z",
      }),
    ).toEqual({
      startDate: "2026-01-01T00:00:00.000Z",
      endDate: "2026-01-31T23:59:59.999Z",
      ascending: false,
      unit: "kg",
    });
  });

  it("forwards optional limit", () => {
    expect(
      buildAppleHealthBodyMassSampleQueryOptions({
        startDate: "a",
        endDate: "b",
        limit: 200,
      }),
    ).toMatchObject({ limit: 200, unit: "kg" });
  });
});
