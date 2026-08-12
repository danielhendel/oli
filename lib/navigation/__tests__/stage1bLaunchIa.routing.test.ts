import fs from "node:fs";
import path from "node:path";

import {
  COMMAND_CENTER_PATH,
  CONSUMER_HOME_HREF,
  DAILY_RECAP_PATH,
} from "@/lib/navigation/consumerHome";

const ROOT = path.join(__dirname, "../../..");

function readSrc(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

describe("Stage 1B auth and compatibility routing", () => {
  it("routes sign-in and sign-up success to Today, not Command Center", () => {
    const signIn = readSrc("app/(auth)/sign-in.tsx");
    const signUp = readSrc("app/(auth)/sign-up.tsx");
    const rootLayout = readSrc("app/_layout.tsx");
    const appIndex = readSrc("app/(app)/index.tsx");

    for (const src of [signIn, signUp, rootLayout, appIndex]) {
      expect(src).toContain("CONSUMER_HOME_HREF");
      expect(src).not.toMatch(/command-center/);
    }
  });

  it("redirects Command Center and Daily Recap deep links to Today", () => {
    const commandCenter = readSrc("app/(app)/command-center/index.tsx");
    const dailyRecap = readSrc("app/(app)/dash/daily-recap.tsx");
    expect(commandCenter).toContain("Redirect");
    expect(commandCenter).toContain("CONSUMER_HOME_HREF");
    expect(dailyRecap).toContain("Redirect");
    expect(dailyRecap).toContain("CONSUMER_HOME_HREF");
    expect(commandCenter).not.toMatch(/Coming soon/i);
    expect(dailyRecap).not.toMatch(/Coming soon/i);
  });

  it("keeps path constants aligned with redirected files", () => {
    expect(CONSUMER_HOME_HREF).toBe("/(app)/(tabs)/dash");
    expect(COMMAND_CENTER_PATH).toBe("/(app)/command-center");
    expect(DAILY_RECAP_PATH).toBe("/(app)/dash/daily-recap");
  });

  it("does not leave launch-facing Program links to placeholder builders", () => {
    const program = readSrc("app/(app)/(tabs)/program.tsx");
    expect(program).not.toContain("program-add-button");
    expect(program).not.toContain("ProgramCategoryCards");
    expect(program).not.toContain("/(app)/program/cardio");
    expect(program).not.toContain("/(app)/program/nutrition");
    expect(program).not.toContain("/(app)/program/recovery");
    expect(program).toContain("WEEKLY_PROGRESS_CONSUMER_TITLE");
    expect(program).toContain("/(app)/program/workout");
  });

  it("does not link Health hub items at placeholder Health-record routes", () => {
    const hub = readSrc("lib/navigation/healthHubItems.ts");
    expect(hub).not.toContain("/(app)/dna");
    expect(hub).not.toContain("/(app)/medical-history");
    expect(hub).not.toContain("/(app)/scans");
    expect(hub).not.toContain("/(app)/medication");
    expect(hub).not.toMatch(/href:\s*"\/\(app\)\/supplements"/);
    expect(hub).toContain("CANONICAL_SUPPLEMENTS_HREF");
  });
});
