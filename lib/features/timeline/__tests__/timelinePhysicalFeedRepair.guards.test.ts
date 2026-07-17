/**
 * Cross-boundary guards for the physical continuous-feed repair.
 * Aggregate/source assertions only — no private runtime evidence.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("timeline physical feed repair contracts", () => {
  const root = join(__dirname, "..", "..", "..");

  test("feed loads older history at the top boundary only", () => {
    const list = readFileSync(join(root, "ui/timeline/TimelineFeedList.tsx"), "utf8");
    const hook = readFileSync(join(root, "features/timeline/useTimelineFeed.ts"), "utf8");
    expect(list).toContain("onStartReached");
    expect(list).not.toMatch(/onEndReached\s*=/);
    expect(list).toContain("maintainVisibleContentPosition");
    expect(hook).toContain("loadOlder");
    expect(hook).toContain("inFlightOlderCursorRef");
    expect(hook).toContain("groupSectionsAscending");
  });

  test("feed and fallback share TimelineRailRow", () => {
    const list = readFileSync(join(root, "ui/timeline/TimelineFeedList.tsx"), "utf8");
    const rail = readFileSync(join(root, "ui/timeline/TimelineRail.tsx"), "utf8");
    expect(list).toContain("TimelineRailRow");
    expect(rail).toContain("TimelineRailRow");
    expect(list).not.toContain("borderBottomWidth: StyleSheet.hairlineWidth");
  });

  test("Timeline normalizer reconciles workouts via shared core", () => {
    const normalize = readFileSync(
      join(root, "../services/api/src/lib/timeline/normalizeDay.ts"),
      "utf8",
    );
    expect(normalize).toContain("reconcileWorkoutSessionsCore");
    expect(normalize).toContain("buildReconciledWorkoutItems");
    expect(normalize).toContain("workout_session:");
    expect(normalize).toContain('ev.kind === "workout" || ev.kind === "strength_workout"');
    expect(normalize).toContain("continue; // reconciled above");
  });

  test("no provider payload / raw URL telemetry in feed UI path", () => {
    const list = readFileSync(join(root, "ui/timeline/TimelineFeedList.tsx"), "utf8");
    const screen = readFileSync(join(root, "ui/timeline/TimelineFeedScreen.tsx"), "utf8");
    const hook = readFileSync(join(root, "features/timeline/useTimelineFeed.ts"), "utf8");
    for (const src of [list, screen, hook]) {
      expect(src).not.toContain("NET_TRACE");
      expect(src).not.toContain("providerPayload");
      expect(src).not.toContain("rawPayload");
      expect(src).not.toMatch(/console\.(log|debug|info)\([^)]*cursor/);
    }
  });
});
