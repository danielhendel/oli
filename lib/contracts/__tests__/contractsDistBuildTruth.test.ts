/**
 * Regression: @oli/contracts dist emit must include bodyCompositionGoal after the normal build path.
 * Loads dist by absolute path so Jest's source mapper for `@oli/contracts` cannot hide a missing emit.
 */
import fs from "node:fs";
import path from "node:path";

const distGoalJs = path.join(__dirname, "../dist/bodyCompositionGoal.js");
const distIndexJs = path.join(__dirname, "../dist/index.js");

describe("@oli/contracts dist build truth", () => {
  it("emits bodyCompositionGoal.js under lib/contracts/dist", () => {
    expect(fs.existsSync(distGoalJs)).toBe(true);

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require(distGoalJs) as {
      bodyCompositionGoalV1Schema?: { safeParse?: unknown };
    };
    expect(typeof mod.bodyCompositionGoalV1Schema?.safeParse).toBe("function");
  });

  it("re-exports bodyCompositionGoal from dist/index.js", () => {
    expect(fs.existsSync(distIndexJs)).toBe(true);

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const root = require(distIndexJs) as {
      bodyCompositionGoalV1Schema?: { safeParse?: unknown };
    };
    expect(typeof root.bodyCompositionGoalV1Schema?.safeParse).toBe("function");
  });
});
