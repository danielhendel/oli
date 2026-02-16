import fs from "node:fs";
import path from "node:path";

/**
 * Phase 3A strategy doc test. Always asserts the doc exists so `npm test` passes.
 * Ordering (Phase 2 before Phase 3A) is enforced in the proof-gate script; when
 * PHASE3A_PROOF_GATE=1 we also assert PHASE2_PROOF_GATE_PASSED=1.
 */
describe("Phase 3A integration strategy", () => {
  it("has a binding strategy doc and depends on Phase 2 proof gate when run in proof gate", () => {
    const rootDir = path.resolve(__dirname, "../../..");
    const strategyDocPath = path.join(
      rootDir,
      "docs/00_truth/phase3/PHASE_3A_INTEGRATION_STRATEGY.md",
    );

    expect(fs.existsSync(strategyDocPath)).toBe(true);

    if (process.env.PHASE3A_PROOF_GATE === "1") {
      expect(process.env.PHASE2_PROOF_GATE_PASSED).toBe("1");
    }
  });
});

