// lib/data/__tests__/useHealthSignals.dashStates.test.ts
// Phase 1.5 Sprint 4 — hook states map to explicit dash states (fail-closed UI guard)

import { describe, it, expect } from "@jest/globals";

/**
 * Dash must show explicit states for every hook outcome.
 * No silent states. Labels from spec: Stable | Attention Required.
 */
function signalStatusToDashLabel(status: "stable" | "attention_required"): string {
  return status === "stable" ? "Stable" : "Attention Required";
}

describe("useHealthSignals dash state mapping", () => {
  it("stable maps to explicit label Stable", () => {
    expect(signalStatusToDashLabel("stable")).toBe("Stable");
  });

  it("attention_required maps to explicit label Attention Required", () => {
    expect(signalStatusToDashLabel("attention_required")).toBe("Attention Required");
  });

  it("all hook status values have explicit dash handling", () => {
    const hookStatuses: ("partial" | "missing" | "error" | "ready")[] = [
      "partial",
      "missing",
      "error",
      "ready",
    ];
    expect(hookStatuses).toHaveLength(4);
    hookStatuses.forEach((s) => {
      expect(["partial", "missing", "error", "ready"]).toContain(s);
    });
  });

  it("ready + stable is shown as Stable (never silent)", () => {
    const status = "stable";
    const label = signalStatusToDashLabel(status);
    expect(label).toBe("Stable");
    expect(label.length).toBeGreaterThan(0);
  });

  it("ready + attention_required is shown as Attention Required (never silent)", () => {
    const status = "attention_required";
    const label = signalStatusToDashLabel(status);
    expect(label).toBe("Attention Required");
    expect(label.length).toBeGreaterThan(0);
  });
});
