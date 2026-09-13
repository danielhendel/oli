import fs from "node:fs";
import path from "node:path";

describe("HomeScreenContent request budget", () => {
  it("does not import Daily Monitor or Apple Health ingest surfaces", () => {
    const src = fs.readFileSync(
      path.join(__dirname, "../HomeScreenContent.tsx"),
      "utf8",
    );
    expect(src).not.toMatch(/DailyMonitorHost/);
    expect(src).not.toMatch(/useTodayHealthHero/);
    expect(src).not.toMatch(/useDailyReadinessCard/);
    expect(src).not.toMatch(/useDailyMonitor/);
    expect(src).not.toMatch(/useAppleHealth/);
    expect(src).not.toMatch(/HealthKit/);
    expect(src).not.toMatch(/runAppleHealth/);
    expect(src).not.toMatch(/oura/i);
    expect(src).toMatch(/MyHealthPerformanceSection/);
    expect(src).toMatch(/AppNavigationDrawer/);
  });

  it("Today route mounts DailyMonitorHost exactly once in source", () => {
    const todaySrc = fs.readFileSync(
      path.join(__dirname, "../../../../app/(app)/(tabs)/today.tsx"),
      "utf8",
    );
    const dashSrc = fs.readFileSync(
      path.join(__dirname, "../../../../app/(app)/(tabs)/dash.tsx"),
      "utf8",
    );
    expect(todaySrc).toMatch(/import\s+\{\s*DailyMonitorHost\s*\}/);
    expect(todaySrc).toMatch(/<DailyMonitorHost\s*\/>/);
    expect(todaySrc.match(/<DailyMonitorHost\b/g)?.length ?? 0).toBe(1);
    expect(dashSrc).not.toMatch(/DailyMonitorHost/);
    expect(dashSrc).toMatch(/HomeScreenContent/);
  });
});
