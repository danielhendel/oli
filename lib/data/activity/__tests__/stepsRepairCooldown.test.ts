import { describe, it, expect } from "@jest/globals";
import {
  STEPS_REPAIR_AUTO_COOLDOWN_MS,
  stepsRepairCooldownAllowsRun,
} from "@/lib/data/activity/stepsRepairCooldown";

describe("stepsRepairCooldownAllowsRun", () => {
  it("allows when bypassCooldown is true", () => {
    expect(
      stepsRepairCooldownAllowsRun({
        lastCompletedAtIso: new Date(0).toISOString(),
        nowMs: 0,
        bypassCooldown: true,
      }),
    ).toBe(true);
  });

  it("allows when no prior completion", () => {
    expect(
      stepsRepairCooldownAllowsRun({
        lastCompletedAtIso: null,
        nowMs: 1_000_000,
        bypassCooldown: false,
      }),
    ).toBe(true);
  });

  it("blocks inside cooldown window", () => {
    const last = "2026-04-08T12:00:00.000Z";
    const lastMs = Date.parse(last);
    expect(
      stepsRepairCooldownAllowsRun({
        lastCompletedAtIso: last,
        nowMs: lastMs + STEPS_REPAIR_AUTO_COOLDOWN_MS - 1,
        bypassCooldown: false,
      }),
    ).toBe(false);
  });

  it("allows after cooldown window", () => {
    const last = "2026-04-08T12:00:00.000Z";
    const lastMs = Date.parse(last);
    expect(
      stepsRepairCooldownAllowsRun({
        lastCompletedAtIso: last,
        nowMs: lastMs + STEPS_REPAIR_AUTO_COOLDOWN_MS,
        bypassCooldown: false,
      }),
    ).toBe(true);
  });
});
