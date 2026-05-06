import { describe, expect, it } from "@jest/globals";
import type { Firestore } from "firebase-admin/firestore";
import type { DailyFacts } from "../../types/health";
import { resolveDailyEnergyForFactsV1 } from "../resolveDailyEnergyForFactsV1";

type QueryTracker = {
  whereCalls: { field: string; op: string; value: unknown }[];
  orderByCalls: { field: string; dir?: string }[];
  limitCalls: number[];
};

function makeDb(input: {
  profile?: unknown;
  priorFacts?: DailyFacts[];
  tracker?: QueryTracker;
}): Firestore {
  const tracker = input.tracker;
  const query = {
    where: (field: string, op: string, value: unknown) => {
      tracker?.whereCalls.push({ field, op, value });
      return query;
    },
    orderBy: (field: string, dir?: string) => {
      tracker?.orderByCalls.push(dir ? { field, dir } : { field });
      return query;
    },
    limit: (n: number) => {
      tracker?.limitCalls.push(n);
      return query;
    },
    get: async () => ({
      docs: (input.priorFacts ?? []).map((f) => ({ data: () => f })),
    }),
  };

  return {
    collection: () => ({
      doc: () => ({
        collection: (name: string) => {
          if (name === "profile") {
            return {
              doc: () => ({
                get: async () => ({
                  exists: input.profile !== undefined,
                  data: () => input.profile,
                }),
              }),
            };
          }
          if (name === "dailyFacts") {
            return {
              where: query.where,
            };
          }
          throw new Error(`unexpected collection: ${name}`);
        },
      }),
    }),
  } as unknown as Firestore;
}

const baseFacts: DailyFacts = {
  schemaVersion: 1,
  userId: "u1",
  date: "2026-05-05",
  computedAt: "2026-05-05T12:00:00.000Z",
};

describe("resolveDailyEnergyForFactsV1", () => {
  it("returns energy with baseline and steps when profile + same-day weight + steps exist", async () => {
    const db = makeDb({
      profile: {
        identity: { dateOfBirth: "1990-01-01", sexAtBirth: "female" },
        body: { heightCm: 168 },
      },
    });

    const energy = await resolveDailyEnergyForFactsV1({
      db,
      userId: "u1",
      dailyFacts: {
        ...baseFacts,
        body: { weightKg: 72 },
        activity: { steps: 9000 },
      },
    });

    expect(energy).toBeDefined();
    expect(energy?.factors.baseline).toBeDefined();
    expect(energy?.factors.steps).toBeDefined();
  });

  it("uses prior dailyFacts weight carry-forward when same-day weight is missing", async () => {
    const db = makeDb({
      profile: {
        identity: { dateOfBirth: "1990-01-01", sexAtBirth: "male" },
        body: { heightCm: 180 },
      },
      priorFacts: [
        {
          ...baseFacts,
          date: "2026-05-04",
          body: { weightKg: 79 },
        },
      ],
    });

    const energy = await resolveDailyEnergyForFactsV1({
      db,
      userId: "u1",
      dailyFacts: {
        ...baseFacts,
        activity: { steps: 7000 },
      },
    });

    expect(energy).toBeDefined();
    expect(energy?.factors.baseline?.inputsUsed).toContain("body.weightKg:lastKnown");
    expect(energy?.factors.steps?.inputsUsed).toContain("body.weightKg:lastKnown");
  });

  it("returns undefined when profile/body/steps are missing", async () => {
    const db = makeDb({});
    const energy = await resolveDailyEnergyForFactsV1({
      db,
      userId: "u1",
      dailyFacts: baseFacts,
    });
    expect(energy).toBeUndefined();
  });

  it("queries prior dailyFacts using date field with bounded 90-day window", async () => {
    const tracker: QueryTracker = {
      whereCalls: [],
      orderByCalls: [],
      limitCalls: [],
    };
    const db = makeDb({
      tracker,
      priorFacts: [],
    });

    await resolveDailyEnergyForFactsV1({
      db,
      userId: "u1",
      dailyFacts: { ...baseFacts, date: "2026-05-05", activity: { steps: 1 } },
    });

    expect(tracker.whereCalls).toEqual(
      expect.arrayContaining([
        { field: "date", op: ">=", value: "2026-02-04" },
        { field: "date", op: "<", value: "2026-05-05" },
      ]),
    );
    expect(tracker.orderByCalls).toEqual([{ field: "date", dir: "desc" }]);
    expect(tracker.limitCalls).toEqual([90]);
  });
});
