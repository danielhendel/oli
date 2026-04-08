import { describe, it, expect } from "@jest/globals";
import { runAppleHealthStepsBackfillSerialized } from "@/lib/data/activity/appleHealthStepsBackfillMutex";

describe("runAppleHealthStepsBackfillSerialized", () => {
  it("runs jobs strictly one after another (no overlap)", async () => {
    let concurrent = 0;
    let maxConcurrent = 0;
    const run = async (id: number) => {
      concurrent += 1;
      maxConcurrent = Math.max(maxConcurrent, concurrent);
      await new Promise<void>((r) => setTimeout(r, 5));
      concurrent -= 1;
      return id;
    };
    const a = runAppleHealthStepsBackfillSerialized(() => run(1));
    const b = runAppleHealthStepsBackfillSerialized(() => run(2));
    const [r1, r2] = await Promise.all([a, b]);
    expect(maxConcurrent).toBe(1);
    expect(r1).toBe(1);
    expect(r2).toBe(2);
  });
});
