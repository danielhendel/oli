// lib/modules/__tests__/commandCenterReadiness.test.ts
import { getModuleBadge, isModuleDisabled, type CommandCenterDataReadinessState } from "../commandCenterReadiness";

describe("commandCenterReadiness (Phase 1 §4.1 fail-closed)", () => {
  const states: CommandCenterDataReadinessState[] = ["loading", "empty", "partial", "invalid", "ready"];

  it("keeps Settings accessible in all data states", () => {
    for (const s of states) {
      expect(isModuleDisabled("settings", s)).toBe(false);
    }
  });

  it("fails closed for non-settings modules when data is not ready", () => {
    for (const s of states) {
      if (s === "ready") continue;
      expect(isModuleDisabled("body", s)).toBe(true);
      expect(isModuleDisabled("training", s)).toBe(true);
      expect(isModuleDisabled("nutrition", s)).toBe(true);
    }
  });

  it("shows rollout badges when data is ready", () => {
    expect(getModuleBadge("body", "ready")).toBe("Ready");
    expect(getModuleBadge("training", "ready")).toBe("Ready");
    expect(getModuleBadge("nutrition", "ready")).toBe("Ready");
    expect(getModuleBadge("recovery", "ready")).toBe("Soon");
    expect(getModuleBadge("labs", "ready")).toBe("Soon");
  });

  it("shows data-status badges when data is not ready", () => {
    expect(getModuleBadge("body", "loading")).toBe("Loading");
    expect(getModuleBadge("body", "empty")).toBe("Empty");
    expect(getModuleBadge("body", "partial")).toBe("Needs input");
    expect(getModuleBadge("body", "invalid")).toBe("Error");
  });
});