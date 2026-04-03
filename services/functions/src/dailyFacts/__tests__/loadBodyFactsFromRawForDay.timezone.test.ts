import { describe, it, expect } from "@jest/globals";
import { loadBodyFactsFromRawForDay } from "../loadBodyFactsFromRawForDay";
import { deriveWeightPointDayKey } from "../../../../../lib/data/body/weightDayKey";

type MockDoc = { data: () => Record<string, unknown> };

function makeDb(params: {
  rawDocs: MockDoc[];
  metricSources?: Record<string, string>;
}) {
  const rawQuery = {
    where: () => rawQuery,
    get: async () => ({ docs: params.rawDocs }),
  };
  const userRef = {
    collection: (name: string) => {
      if (name === "rawEvents") return rawQuery;
      throw new Error(`Unexpected collection: ${name}`);
    },
    get: async () => ({
      data: () => ({
        preferences: { metricSources: params.metricSources ?? {} },
      }),
    }),
  };
  return {
    collection: () => ({
      doc: () => userRef,
    }),
  };
}

describe("loadBodyFactsFromRawForDay timezone boundaries", () => {
  it("assigns near-midnight payload to prior local day", async () => {
    const payloadTime = "2026-03-31T00:30:00.000Z";
    const rawDocs: MockDoc[] = [
      {
        data: () => ({
          kind: "weight",
          observedAt: payloadTime,
          sourceId: "apple_health",
          payload: {
            time: payloadTime,
            timezone: "America/Los_Angeles",
            weightKg: 80.2,
          },
        }),
      },
    ];
    const db = makeDb({ rawDocs }) as never;
    const facts = await loadBodyFactsFromRawForDay(db, "u1", "2026-03-30");
    expect(facts?.weightKg).toBe(80.2);
  });

  it("keeps server/client day assignment aligned for payload timezone", async () => {
    const payloadTime = "2026-03-31T23:30:00.000Z";
    const payloadTimezone = "Asia/Tokyo";
    const rawDocs: MockDoc[] = [
      {
        data: () => ({
          kind: "weight",
          observedAt: payloadTime,
          sourceId: "apple_health",
          payload: {
            time: payloadTime,
            timezone: payloadTimezone,
            weightKg: 79.1,
            bodyFatPercent: 18.5,
          },
        }),
      },
    ];
    const clientDay = deriveWeightPointDayKey(
      { time: payloadTime, timezone: payloadTimezone },
      payloadTime,
      "America/Los_Angeles",
    );
    const db = makeDb({ rawDocs }) as never;
    const serverFacts = await loadBodyFactsFromRawForDay(db, "u1", clientDay);
    expect(clientDay).toBe("2026-04-01");
    expect(serverFacts).toEqual({ weightKg: 79.1, bodyFatPercent: 18.5 });
  });

  it("supports body_composition-only metrics on the correct day", async () => {
    const payloadTime = "2026-03-31T23:30:00.000Z";
    const payloadTimezone = "Asia/Tokyo";
    const rawDocs: MockDoc[] = [
      {
        data: () => ({
          kind: "body_composition",
          observedAt: payloadTime,
          sourceId: "healthkit",
          payload: {
            time: payloadTime,
            timezone: payloadTimezone,
            bmi: 24.4,
          },
        }),
      },
    ];
    const clientDay = deriveWeightPointDayKey(
      { time: payloadTime, timezone: payloadTimezone },
      payloadTime,
      "America/Los_Angeles",
    );
    const db = makeDb({ rawDocs }) as never;
    const serverFacts = await loadBodyFactsFromRawForDay(db, "u1", clientDay);
    expect(serverFacts).toEqual({ bmi: 24.4 });
  });
});

