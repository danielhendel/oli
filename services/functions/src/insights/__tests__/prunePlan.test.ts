// services/functions/src/insights/__tests__/prunePlan.test.ts

import { computeInsightPrunePlan } from "../prunePlan";

describe("computeInsightPrunePlan", () => {
  test("deletes ids not in keepIds", () => {
    const res = computeInsightPrunePlan({
      existingIds: ["a", "b", "c"],
      keepIds: new Set(["a", "c"]),
    });

    expect(res.toDelete.sort()).toEqual(["b"]);
  });

  test("deletes all when keepIds is empty", () => {
    const res = computeInsightPrunePlan({
      existingIds: ["a", "b"],
      keepIds: new Set(),
    });

    expect(res.toDelete.sort()).toEqual(["a", "b"]);
  });

  test("deletes none when existing is empty", () => {
    const res = computeInsightPrunePlan({
      existingIds: [],
      keepIds: new Set(["a"]),
    });

    expect(res.toDelete).toEqual([]);
  });
});
