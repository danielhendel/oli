import fs from "node:fs";
import path from "node:path";

const BASELINE_FILES = [
  "ActivityOverviewCard.tsx",
  "ActivityHistorySummaryCard.tsx",
  "ActivityTodayCard.tsx",
  "ActivityDailyDetailsCard.tsx",
  "ActivityThisWeekCard.tsx",
  "ActivityStepRatingsCard.tsx",
  "ActivityStepTierLegend.tsx",
] as const;

const LEGACY_LIGHT_MODE_LABEL_GRAY =
  /#1C1C1E|#8E8E93|#3C3C43|#636366|#48484A|#000000|color:\s*"black"/;

describe("activity baseline / Today card sources", () => {
  it("do not use legacy light-mode body text hex colors", () => {
    const root = path.join(__dirname, "..");
    const offenders: string[] = [];
    for (const name of BASELINE_FILES) {
      const raw = fs.readFileSync(path.join(root, name), "utf8");
      const stripped = raw
        .split("\n")
        .filter((line) => !line.includes('shadowColor: "#000000"'))
        .join("\n");
      if (LEGACY_LIGHT_MODE_LABEL_GRAY.test(stripped)) {
        offenders.push(name);
      }
    }
    expect(offenders).toEqual([]);
  });
});
