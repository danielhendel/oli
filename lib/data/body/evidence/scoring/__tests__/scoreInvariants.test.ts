/**
 * Dual Score engine boundary invariants (NO-GO, purity, scope).
 */
import { describe, expect, it } from "@jest/globals";
import fs from "node:fs";
import path from "node:path";

import {
  BODY_COMPOSITION_HEALTH_SCORE_PUBLIC_STATUS,
  BODY_COMPOSITION_HEALTH_SCORE_VERSION,
  BODY_COMPOSITION_PERFORMANCE_SUPPORTING_SCORE_PUBLIC_STATUS,
  BODY_COMPOSITION_PERFORMANCE_SUPPORTING_SCORE_VERSION,
} from "@oli/contracts";

import { scoreHealthFromBundle, healthReadyBundle } from "../testFixtures";

describe("Dual Score invariants", () => {
  it("version constants remain exact", () => {
    expect(BODY_COMPOSITION_HEALTH_SCORE_VERSION).toBe(
      "body_composition_health_score_draft_v1",
    );
    expect(BODY_COMPOSITION_PERFORMANCE_SUPPORTING_SCORE_VERSION).toBe(
      "body_composition_performance_supporting_score_draft_v1",
    );
  });

  it("public NO-GO constants are explicit", () => {
    expect(BODY_COMPOSITION_HEALTH_SCORE_PUBLIC_STATUS).toBe("NO-GO");
    expect(BODY_COMPOSITION_PERFORMANCE_SUPPORTING_SCORE_PUBLIC_STATUS).toBe("NO-GO");
  });

  it("consumer app/ does not import scoring engines", () => {
    const appDir = path.join(process.cwd(), "app");
    if (!fs.existsSync(appDir)) return;
    const files: string[] = [];
    function walk(dir: string) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.(tsx?|jsx?)$/.test(entry.name)) files.push(full);
      }
    }
    walk(appDir);
    const imports = files
      .flatMap((f) => fs.readFileSync(f, "utf8").split("\n"))
      .filter((line) => /^\s*import\b/.test(line))
      .join("\n");
    expect(imports).not.toMatch(/evidence\/scoring|scoreHealthComposition|scorePerformanceSupporting/);
  });

  it("scoring sources avoid Date.now, Math.random, firebase, dampening, renormalization", () => {
    const dir = path.join(__dirname, "..");
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".ts") && !f.includes("__tests__") && f !== "testFixtures.ts");
    const joined = files.map((f) => fs.readFileSync(path.join(dir, f), "utf8")).join("\n");
    const codeLines = joined
      .split("\n")
      .filter((line) => !/^\s*(\/\/|\*|\/\*|\*\/)/.test(line))
      .join("\n");
    expect(codeLines).not.toMatch(/Date\.now\s*\(/);
    expect(codeLines).not.toMatch(/Math\.random\s*\(/);
    expect(codeLines).not.toMatch(/firebase|firestore/i);
    expect(joined).not.toMatch(/renormaliz/i);
    expect(joined).not.toMatch(/dampen/i);
    expect(joined).not.toMatch(/evaluateH4|evaluateP2|H4_|P2_/);
    expect(joined).not.toMatch(/BF%|bodyFatPercent|scoreBfPercent/);
  });

  it("withheld constructs use null — never zero as missing", () => {
    const bundle = healthReadyBundle({ dateOfBirth: "2020-01-01" });
    const result = scoreHealthFromBundle(bundle);
    expect(result.status).toBe("unavailable");
    for (const c of Object.values(result.constructScores)) {
      if (c.primaryReason != null) {
        expect(c.value).toBeNull();
      }
    }
  });

  it("available scores stay within [0, 100]", () => {
    const result = scoreHealthFromBundle(healthReadyBundle({ whtr: 0.45, fmi: 5.5, almi: 8 }));
    expect(result.score).not.toBeNull();
    expect(result.score!).toBeGreaterThanOrEqual(0);
    expect(result.score!).toBeLessThanOrEqual(100);
    for (const c of Object.values(result.constructScores)) {
      if (c.value != null) {
        expect(c.value).toBeGreaterThanOrEqual(0);
        expect(c.value).toBeLessThanOrEqual(100);
      }
    }
  });
});
