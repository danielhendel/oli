/**
 * Hard invariants on recompute dayKey vs canonical.day (Apple steps safety).
 */
import { describe, it, expect } from "@jest/globals";
import type { Firestore } from "firebase-admin/firestore";

import { recomputeDerivedTruthForDay } from "../recomputeForDay";
import type { StepsCanonicalEvent } from "../../types/health";

describe("recomputeDerivedTruthForDay — day guards", () => {
  it("throws RECOMPUTE_DAY_MISMATCH when canonicalAnchorDay disagrees with dayKey", async () => {
    await expect(
      recomputeDerivedTruthForDay({
        db: {} as Firestore,
        userId: "u1",
        dayKey: "2026-01-01",
        canonicalAnchorDay: "2026-01-02",
        trigger: { type: "admin", source: "unit_test" },
      }),
    ).rejects.toThrow(/RECOMPUTE_DAY_MISMATCH/);
  });

  it("throws RECOMPUTE_CANONICAL_DAY_DRIFT when loaded event.day disagrees with dayKey", async () => {
    const bad: StepsCanonicalEvent = {
      kind: "steps",
      id: "corrupt_row",
      userId: "u1",
      sourceId: "apple_health",
      start: "2026-01-04T00:00:00.000Z",
      end: "2026-01-04T23:59:59.999Z",
      day: "2099-01-01",
      timezone: "Etc/UTC",
      createdAt: "2026-01-04T12:00:00.000Z",
      updatedAt: "2026-01-04T12:00:00.000Z",
      schemaVersion: 1,
      steps: 10,
    };

    const makeQuery = (docs: { data: () => unknown }[] = []) => {
      const query = {
        where: () => query,
        orderBy: () => query,
        limit: () => query,
        get: async () => ({ docs }),
      };
      return query;
    };

    const mockDb = {
      collection: () => ({
        doc: () => ({
          collection: (name: string) => {
            if (name === "events") {
              return {
                where: () => makeQuery([{ data: () => bad }]),
              };
            }
            if (name === "profile") {
              return {
                doc: () => ({
                  get: async () => ({
                    exists: false,
                    data: () => undefined,
                  }),
                }),
              };
            }
            return { where: () => makeQuery([]) };
          },
        }),
      }),
    } as unknown as Firestore;

    await expect(
      recomputeDerivedTruthForDay({
        db: mockDb,
        userId: "u1",
        dayKey: "2026-01-04",
        trigger: { type: "admin", source: "unit_test" },
      }),
    ).rejects.toThrow(/RECOMPUTE_CANONICAL_DAY_DRIFT/);
  });
});
