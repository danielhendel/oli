/**
 * Bounded backfill orchestration: chains runAnchoredWorkoutsSync, stops safely.
 */

import { runWorkoutHistoryBackfillPasses } from "@/lib/integrations/appleHealth/runWorkoutHistoryBackfill";
import * as syncModule from "@/lib/integrations/appleHealth/runAnchoredWorkoutsSync";
import type { RunAnchoredWorkoutsSyncDeps } from "@/lib/integrations/appleHealth/runAnchoredWorkoutsSync";

const noopDeps = {} as RunAnchoredWorkoutsSyncDeps;

describe("runWorkoutHistoryBackfillPasses", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it("stops after one pass when mayHaveMoreWorkouts is false", async () => {
    const spy = jest.spyOn(syncModule, "runAnchoredWorkoutsSync").mockResolvedValue({
      ok: true,
      mayHaveMoreWorkouts: false,
    });

    const r = await runWorkoutHistoryBackfillPasses(
      { uid: "u", token: "t", limit: 500, maxPasses: 3 },
      noopDeps,
    );

    expect(r).toEqual({ ok: true, passesRun: 1, mayHaveMoreWorkouts: false });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("runs second pass when first indicates more history", async () => {
    const spy = jest
      .spyOn(syncModule, "runAnchoredWorkoutsSync")
      .mockResolvedValueOnce({ ok: true, mayHaveMoreWorkouts: true })
      .mockResolvedValueOnce({ ok: true, mayHaveMoreWorkouts: false });

    const r = await runWorkoutHistoryBackfillPasses(
      { uid: "u", token: "t", limit: 500, maxPasses: 3 },
      noopDeps,
    );

    expect(r).toEqual({ ok: true, passesRun: 2, mayHaveMoreWorkouts: false });
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("returns ok false without incrementing passesRun on first failure", async () => {
    const spy = jest.spyOn(syncModule, "runAnchoredWorkoutsSync").mockResolvedValue({
      ok: false,
      error: "pull failed",
      requestId: "r1",
    });

    const r = await runWorkoutHistoryBackfillPasses(
      { uid: "u", token: "t", limit: 500, maxPasses: 3 },
      noopDeps,
    );

    expect(r).toEqual({ ok: false, error: "pull failed", requestId: "r1", passesRun: 0 });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("returns ok false after successful pass when next pass fails", async () => {
    const spy = jest
      .spyOn(syncModule, "runAnchoredWorkoutsSync")
      .mockResolvedValueOnce({ ok: true, mayHaveMoreWorkouts: true })
      .mockResolvedValueOnce({ ok: false, error: "ingest failed", requestId: "r2" });

    const r = await runWorkoutHistoryBackfillPasses(
      { uid: "u", token: "t", limit: 500, maxPasses: 3 },
      noopDeps,
    );

    expect(r).toEqual({ ok: false, error: "ingest failed", requestId: "r2", passesRun: 1 });
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("caps at maxPasses and reports mayHaveMoreWorkouts true if still truncated", async () => {
    const spy = jest.spyOn(syncModule, "runAnchoredWorkoutsSync").mockResolvedValue({
      ok: true,
      mayHaveMoreWorkouts: true,
    });

    const r = await runWorkoutHistoryBackfillPasses(
      { uid: "u", token: "t", limit: 500, maxPasses: 2 },
      noopDeps,
    );

    expect(r).toEqual({ ok: true, passesRun: 2, mayHaveMoreWorkouts: true });
    expect(spy).toHaveBeenCalledTimes(2);
  });
});
