/**
 * Guard: SleepNight Oura builders must live only under services/api (TypeScript source).
 * Stale committed .js/.d.ts copies under lib/integrations/oura caused production-risk ambiguity.
 */
import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = path.resolve(__dirname, "../../../../../");

describe("sleepNight Oura builder source uniqueness", () => {
  it("does not commit JS/DTS duplicates under lib/integrations/oura", () => {
    const banned = [
      "lib/integrations/oura/buildSleepNightFromOuraDocument.js",
      "lib/integrations/oura/buildSleepNightFromOuraDocument.d.ts",
      "lib/integrations/oura/resolveOuraSleepIngestBase.js",
      "lib/integrations/oura/resolveOuraSleepIngestBase.d.ts",
    ];
    for (const rel of banned) {
      expect(fs.existsSync(path.join(ROOT, rel))).toBe(false);
    }
  });

  it("keeps TypeScript source of truth under services/api", () => {
    expect(
      fs.existsSync(
        path.join(ROOT, "services/api/src/lib/oura/buildSleepNightFromOuraDocument.ts"),
      ),
    ).toBe(true);
    expect(
      fs.existsSync(path.join(ROOT, "services/api/src/lib/oura/resolveOuraSleepIngestBase.ts")),
    ).toBe(true);
    expect(
      fs.existsSync(path.join(ROOT, "services/api/src/lib/oura/resolveSleepNightWakeDay.ts")),
    ).toBe(true);
  });
});
