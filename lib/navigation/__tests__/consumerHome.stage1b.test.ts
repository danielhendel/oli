import {
  CANONICAL_SUPPLEMENTS_HREF,
  COMMAND_CENTER_PATH,
  CONSUMER_HOME_A11Y_LABEL,
  CONSUMER_HOME_HREF,
  CONSUMER_HOME_LABEL,
  CONSUMER_HOME_TAB_NAME,
  CONSUMER_HOME_TEST_ID,
  DAILY_RECAP_PATH,
  LEGACY_SUPPLEMENTS_PLACEHOLDER_PATH,
} from "@/lib/navigation/consumerHome";
import {
  HEALTH_HUB_FORBIDDEN_LABELS,
  HEALTH_HUB_ITEMS,
} from "@/lib/navigation/healthHubItems";
import {
  PRIMARY_NAV_FORBIDDEN_LABELS,
  PRIMARY_NAVIGATION_ITEMS,
  PRIMARY_PILL_ITEMS,
  HEALTH_NAV_ITEM,
} from "@/lib/navigation/primaryNavigationConfig";
import { OLI_TAB_ROUTES } from "@/lib/navigation/tabRoutes";

describe("Stage 1B consumer home contract", () => {
  it("keeps the filesystem dash route as the canonical Today href", () => {
    expect(CONSUMER_HOME_HREF).toBe(OLI_TAB_ROUTES.dash);
    expect(CONSUMER_HOME_HREF).toBe("/(app)/(tabs)/dash");
    expect(CONSUMER_HOME_TAB_NAME).toBe("dash");
    expect(CONSUMER_HOME_LABEL).toBe("Today");
    expect(CONSUMER_HOME_A11Y_LABEL).toBe("Today");
    expect(CONSUMER_HOME_TEST_ID).toBe("oli-tab-dash");
  });

  it("does not treat Command Center as the consumer home", () => {
    expect(COMMAND_CENTER_PATH).toBe("/(app)/command-center");
    expect(CONSUMER_HOME_HREF).not.toContain("command-center");
  });

  it("documents Daily Recap and legacy supplements as compatibility paths", () => {
    expect(DAILY_RECAP_PATH).toBe("/(app)/dash/daily-recap");
    expect(LEGACY_SUPPLEMENTS_PLACEHOLDER_PATH).toBe("/(app)/supplements");
    expect(CANONICAL_SUPPLEMENTS_HREF).toBe("/(app)/nutrition/supplements");
  });
});

describe("Stage 1B primary navigation contract", () => {
  it("labels the home dock item Today exactly once", () => {
    const todayItems = PRIMARY_NAVIGATION_ITEMS.filter((i) => i.label === "Today");
    expect(todayItems).toHaveLength(1);
    expect(todayItems[0]?.id).toBe("dash");
    expect(todayItems[0]?.action).toEqual({ kind: "tab", tabName: "dash" });
    expect(PRIMARY_PILL_ITEMS.map((i) => i.label)).toEqual([
      "Today",
      "Strength",
      "Cardio",
      "Nutrition",
    ]);
    expect(HEALTH_NAV_ITEM.label).toBe("Health");
  });

  it("forbids competing home labels in the primary dock", () => {
    const labels = new Set(PRIMARY_NAVIGATION_ITEMS.map((i) => i.label));
    for (const forbidden of PRIMARY_NAV_FORBIDDEN_LABELS) {
      expect(labels.has(forbidden)).toBe(false);
    }
    expect(PRIMARY_NAV_FORBIDDEN_LABELS).toEqual(
      expect.arrayContaining(["Dash", "Monitor", "Home", "Command Center"]),
    );
  });
});

describe("Stage 1B Health hub contract", () => {
  it("exposes real domain destinations and Profile", () => {
    expect(HEALTH_HUB_ITEMS.map((i) => i.id)).toEqual([
      "profile",
      "body",
      "activity",
      "recovery",
      "sleep",
      "labs",
      "supplements",
    ]);
    expect(HEALTH_HUB_ITEMS.find((i) => i.id === "body")?.href).toBe("/(app)/body");
    expect(HEALTH_HUB_ITEMS.find((i) => i.id === "activity")?.href).toBe("/(app)/activity");
    expect(HEALTH_HUB_ITEMS.find((i) => i.id === "recovery")?.href).toBe("/(app)/recovery");
    expect(HEALTH_HUB_ITEMS.find((i) => i.id === "sleep")?.href).toBe("/(app)/recovery/sleep");
    expect(HEALTH_HUB_ITEMS.find((i) => i.id === "labs")?.href).toBe("/(app)/labs");
    expect(HEALTH_HUB_ITEMS.find((i) => i.id === "supplements")?.href).toBe(
      CANONICAL_SUPPLEMENTS_HREF,
    );
  });

  it("omits Health-record placeholders from launch navigation", () => {
    const labels = new Set(HEALTH_HUB_ITEMS.map((i) => i.label));
    const ids = new Set(HEALTH_HUB_ITEMS.map((i) => i.id));
    for (const forbidden of HEALTH_HUB_FORBIDDEN_LABELS) {
      expect(labels.has(forbidden)).toBe(false);
    }
    expect(ids.has("dna" as never)).toBe(false);
    expect(ids.has("medical_history" as never)).toBe(false);
    expect(ids.has("scans" as never)).toBe(false);
    expect(ids.has("medication" as never)).toBe(false);
    expect(HEALTH_HUB_ITEMS.every((i) => !i.href.includes("/dna"))).toBe(true);
    expect(HEALTH_HUB_ITEMS.every((i) => i.href !== "/(app)/supplements")).toBe(true);
  });
});
