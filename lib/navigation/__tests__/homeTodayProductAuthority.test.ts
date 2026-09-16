import fs from "node:fs";
import path from "node:path";

import {
  CONSUMER_HOME_SCREEN_TITLE,
  CONSUMER_TODAY_HREF,
  CONSUMER_TODAY_LABEL,
  HOME_MY_HEALTH_PERFORMANCE_TITLE,
  HOME_TODAY_EMPTY_BODY,
  HOME_TODAY_EMPTY_TITLE,
} from "@/lib/navigation/consumerHome";
import { PRIMARY_NAVIGATION_ITEMS } from "@/lib/navigation/primaryNavigationConfig";

const ROOT = path.join(__dirname, "../../..");

function readDoc(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

describe("Home · Today product authority", () => {
  it("locks five primary destinations in code", () => {
    expect(PRIMARY_NAVIGATION_ITEMS.map((i) => i.label)).toEqual([
      "Home",
      "Today",
      "Plan",
      "Progress",
      "You",
    ]);
    expect(CONSUMER_TODAY_LABEL).toBe("Today");
    expect(CONSUMER_TODAY_HREF).toBe("/(app)/(tabs)/today");
    expect(CONSUMER_HOME_SCREEN_TITLE).toBe("Oli");
    expect(HOME_MY_HEALTH_PERFORMANCE_TITLE).toBe("My Health & Performance");
  });

  it("uses honest Today empty copy without Building your health picture", () => {
    expect(HOME_TODAY_EMPTY_TITLE).toMatch(/No health data is available for today yet/i);
    expect(HOME_TODAY_EMPTY_BODY).toMatch(/Data will appear as you add information/i);
    expect(HOME_TODAY_EMPTY_TITLE).not.toMatch(/Building your health picture/i);
    expect(HOME_TODAY_EMPTY_BODY).not.toMatch(/Building your health picture/i);
  });

  it("documents five-tab roles and Stage 2 boundaries in active product docs", () => {
    const decisions = readDoc("docs/10_product/decisions/CONSUMER_LAUNCH_PRODUCT_DECISIONS.md");
    const roadmap = readDoc("docs/10_product/roadmap/ROADMAP_REALITY.md");
    const vision = readDoc("docs/10_product/vision/VISION.md");

    for (const doc of [decisions, roadmap, vision]) {
      expect(doc).toMatch(/Home\s*[·•]\s*Today\s*[·•]\s*Plan\s*[·•]\s*Progress\s*[·•]\s*You/);
    }

    expect(decisions).toMatch(/whole-person health/i);
    expect(decisions).toMatch(/Daily Monitor/i);
    expect(decisions).toMatch(/secondary/i);
    expect(decisions).toMatch(/full-width/i);
    expect(decisions).toMatch(/Opening\s*→\s*About You\s*→\s*Home|Opening.*About You.*Home/i);
    expect(decisions).not.toMatch(/Stage 3 has begun|Stage 3 complete/i);
    expect(roadmap).toMatch(/Stage 2/i);
    expect(roadmap).not.toMatch(/Stage 3 has begun/i);
  });
});
