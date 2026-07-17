/**
 * Source + wiring guards for Cloud Run-safe Timeline workout-core imports.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Timeline API emit-safe workout core import", () => {
  const apiRoot = join(__dirname, "..", "..", "..");
  const normalizeSrc = join(apiRoot, "src/lib/timeline/normalizeDay.ts");
  const packageJson = join(apiRoot, "package.json");

  test("normalizeDay imports shared core via emit-safe relative specifier", () => {
    const src = readFileSync(normalizeSrc, "utf8");
    expect(src).toContain("reconcileWorkoutSessionsCore");
    expect(src).toContain(
      'from "../../../../../lib/domain/workouts/reconcileWorkoutSessionsCore"',
    );
    expect(src).not.toMatch(
      /from\s+["']@\/lib\/domain\/workouts\/reconcileWorkoutSessionsCore["']/,
    );
    // Does not duplicate merger inline.
    expect(src).not.toContain("MERGE_GAP_MINUTES");
    expect(src).not.toContain("START_PROXIMITY_MINUTES");
  });

  test("API build invokes runtime-resolution and emitted-normalize smoke", () => {
    const pkg = JSON.parse(readFileSync(packageJson, "utf8")) as {
      scripts: Record<string, string>;
    };
    expect(pkg.scripts.build).toContain("assert-runtime-module-resolution.mjs");
    expect(pkg.scripts.build).toContain("smoke-emitted-timeline-normalize.mjs");
    expect(pkg.scripts["check:runtime-module-resolution"]).toContain(
      "assert-runtime-module-resolution.mjs",
    );
  });
});
