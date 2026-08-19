import fs from "node:fs";
import path from "node:path";
import { CONSUMER_HOME_HREF } from "@/lib/navigation/consumerHome";
import { OLI_TAB_ROUTES } from "@/lib/navigation/tabRoutes";
import { PRIMARY_NAVIGATION_ITEMS } from "@/lib/navigation/primaryNavigationConfig";
import { ACTIVITY_CONSUMER_LABEL } from "@/lib/navigation/domainPresentation";
import { YOU_HUB_ALL_ITEMS, YOU_HUB_FORBIDDEN_LABELS } from "@/lib/navigation/youHubItems";

const ROOT = path.join(__dirname, "../../..");

function readRepoFile(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

describe("R1 analytics-first routing compatibility", () => {
  it("routes auth success and restored session to Home, not Command Center or Today", () => {
    const signIn = readRepoFile("app/(auth)/sign-in.tsx");
    const signUp = readRepoFile("app/(auth)/sign-up.tsx");
    const rootLayout = readRepoFile("app/_layout.tsx");
    const appIndex = readRepoFile("app/(app)/index.tsx");

    expect(signIn).toContain("CONSUMER_HOME_HREF");
    expect(signIn).not.toContain("command-center");
    expect(signUp).toContain("CONSUMER_HOME_HREF");
    expect(signUp).not.toContain("command-center");
    expect(rootLayout).toContain("CONSUMER_HOME_HREF");
    expect(rootLayout).not.toMatch(/replace\(.*command-center/);
    expect(appIndex).toContain("CONSUMER_HOME_HREF");
    expect(CONSUMER_HOME_HREF).toBe(OLI_TAB_ROUTES.dash);
  });

  it("redirects Command Center and Daily Recap to Home", () => {
    const commandCenter = readRepoFile("app/(app)/command-center/index.tsx");
    const dailyRecap = readRepoFile("app/(app)/dash/daily-recap.tsx");
    expect(commandCenter).toMatch(/Redirect/);
    expect(commandCenter).toContain("CONSUMER_HOME_HREF");
    expect(commandCenter).not.toContain("COMMAND_CENTER_MODULES");
    expect(dailyRecap).toContain("Redirect");
    expect(dailyRecap).toContain("CONSUMER_HOME_HREF");
    expect(dailyRecap).not.toContain("Daily Recap screen will open");
  });

  it("redirects Health supplements placeholder to Nutrition supplements", () => {
    const supplements = readRepoFile("app/(app)/supplements/index.tsx");
    expect(supplements).toMatch(/Redirect/);
    expect(supplements).toContain("/(app)/nutrition/supplements");
    expect(supplements).not.toContain("HealthRecordPlaceholderScreen");
  });

  it("redirects Program builder hub away from placeholder grid", () => {
    const builder = readRepoFile("app/(app)/program/builder.tsx");
    expect(builder).toMatch(/Redirect/);
    expect(builder).toContain("OLI_TAB_ROUTES.program");
    expect(builder).not.toContain("ProgramBuilderHubScreen");
  });

  it("locks production dock to Home Plan Progress You", () => {
    expect(PRIMARY_NAVIGATION_ITEMS.map((i) => i.label)).toEqual([
      "Home",
      "Plan",
      "Progress",
      "You",
    ]);
    expect(PRIMARY_NAVIGATION_ITEMS).toHaveLength(4);
  });

  it("maps Movement only as a presentation label for Activity", () => {
    expect(ACTIVITY_CONSUMER_LABEL).toBe("Movement");
    const youMovement = YOU_HUB_ALL_ITEMS.find((i) => i.id === "movement");
    expect(youMovement?.href).toBe("/(app)/activity");
    expect(youMovement?.label).toBe("Movement");
    const monitorCards = readRepoFile("lib/ui/dash/DailyMonitorDomainCards.tsx");
    expect(monitorCards).toContain("ACTIVITY_CONSUMER_LABEL");
    expect(monitorCards).not.toMatch(/title=["']Activity["']/);
  });

  it("hides launch-facing Health placeholders from You", () => {
    const labels = YOU_HUB_ALL_ITEMS.map((i) => i.label);
    for (const forbidden of YOU_HUB_FORBIDDEN_LABELS) {
      expect(labels.some((l) => l.includes(forbidden))).toBe(false);
    }
    expect(YOU_HUB_ALL_ITEMS.find((i) => i.id === "supplements")?.href).toBe(
      "/(app)/nutrition/supplements",
    );
  });
});
