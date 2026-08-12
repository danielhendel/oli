import {
  PRIMARY_NAV_FORBIDDEN_LABELS,
  PRIMARY_NAVIGATION_ITEMS,
  PRIMARY_PILL_ITEMS,
  HEALTH_NAV_ITEM,
} from "@/lib/navigation/primaryNavigationConfig";
import {
  HEALTH_HUB_FORBIDDEN_LABELS,
  HEALTH_HUB_ITEMS,
} from "@/lib/navigation/healthHubItems";
import {
  isPrimaryNavHealthV1Enabled,
  setPrimaryNavHealthV1EnabledForTests,
} from "@/lib/navigation/primaryNavHealthV1";
import { resolvePrimaryNavActiveDestination } from "@/lib/navigation/resolvePrimaryNavActiveDestination";
import { SECONDARY_EXPLORE_DESTINATIONS } from "@/lib/navigation/secondaryExploreDestinations";
import { CANONICAL_SUPPLEMENTS_HREF } from "@/lib/navigation/consumerHome";

describe("primaryNavHealthV1 flag", () => {
  afterEach(() => {
    setPrimaryNavHealthV1EnabledForTests(null);
    delete process.env.EXPO_PUBLIC_PRIMARY_NAV_HEALTH_V1;
  });

  it("defaults to enabled when unset", () => {
    delete process.env.EXPO_PUBLIC_PRIMARY_NAV_HEALTH_V1;
    setPrimaryNavHealthV1EnabledForTests(null);
    expect(isPrimaryNavHealthV1Enabled()).toBe(true);
  });

  it("enables on \"1\"", () => {
    process.env.EXPO_PUBLIC_PRIMARY_NAV_HEALTH_V1 = "1";
    setPrimaryNavHealthV1EnabledForTests(null);
    expect(isPrimaryNavHealthV1Enabled()).toBe(true);
  });

  it("disables on \"0\"", () => {
    process.env.EXPO_PUBLIC_PRIMARY_NAV_HEALTH_V1 = "0";
    setPrimaryNavHealthV1EnabledForTests(null);
    expect(isPrimaryNavHealthV1Enabled()).toBe(false);
  });

  it("treats unexpected values as enabled", () => {
    process.env.EXPO_PUBLIC_PRIMARY_NAV_HEALTH_V1 = "maybe";
    setPrimaryNavHealthV1EnabledForTests(null);
    expect(isPrimaryNavHealthV1Enabled()).toBe(true);
  });

  it("honors test override over env", () => {
    process.env.EXPO_PUBLIC_PRIMARY_NAV_HEALTH_V1 = "0";
    setPrimaryNavHealthV1EnabledForTests(true);
    expect(isPrimaryNavHealthV1Enabled()).toBe(true);
  });
});

describe("PRIMARY_NAVIGATION_ITEMS contract", () => {
  it("has exactly Today, Strength, Cardio, Nutrition, Health in system order", () => {
    expect(PRIMARY_NAVIGATION_ITEMS.map((i) => i.label)).toEqual([
      "Today",
      "Strength",
      "Cardio",
      "Nutrition",
      "Health",
    ]);
    expect(PRIMARY_NAVIGATION_ITEMS.map((i) => i.id)).toEqual([
      "dash",
      "strength",
      "cardio",
      "nutrition",
      "health",
    ]);
  });

  it("keeps Health out of the primary pill (detached control)", () => {
    expect(PRIMARY_PILL_ITEMS.map((i) => i.id)).toEqual([
      "dash",
      "strength",
      "cardio",
      "nutrition",
    ]);
    expect(PRIMARY_PILL_ITEMS.some((i) => i.id === "health")).toBe(false);
    expect(HEALTH_NAV_ITEM.id).toBe("health");
    expect(HEALTH_NAV_ITEM.action.kind).toBe("menu");
    expect(HEALTH_NAV_ITEM.testID).toBe("oli-health-fab");
  });

  it("does not use forbidden primary labels", () => {
    const labels = new Set(PRIMARY_NAVIGATION_ITEMS.map((i) => i.label));
    for (const forbidden of PRIMARY_NAV_FORBIDDEN_LABELS) {
      expect(labels.has(forbidden)).toBe(false);
    }
  });

  it("models Health as a menu action", () => {
    expect(HEALTH_NAV_ITEM.action.kind).toBe("menu");
  });

  it("gives each destination icon, label, a11y, and testID", () => {
    for (const item of PRIMARY_NAVIGATION_ITEMS) {
      expect(item.icon.length).toBeGreaterThan(0);
      expect(item.iconOutline.length).toBeGreaterThan(0);
      expect(item.label.length).toBeGreaterThan(0);
      expect(item.accessibilityLabel.length).toBeGreaterThan(0);
      expect(item.testID.length).toBeGreaterThan(0);
    }
  });
});

describe("HEALTH_HUB_ITEMS contract", () => {
  it("has honest Stage 1B destinations in product order", () => {
    expect(HEALTH_HUB_ITEMS.map((i) => i.label)).toEqual([
      "Profile",
      "Body Composition",
      "Activity",
      "Recovery",
      "Sleep",
      "Labs",
      "Supplements",
    ]);
  });

  it("excludes Health-record placeholders", () => {
    const labels = new Set(HEALTH_HUB_ITEMS.map((i) => i.label));
    for (const forbidden of HEALTH_HUB_FORBIDDEN_LABELS) {
      expect(labels.has(forbidden)).toBe(false);
    }
  });

  it("reuses Profile, Labs, and Nutrition supplements routes", () => {
    expect(HEALTH_HUB_ITEMS.find((i) => i.id === "profile")?.href).toBe("/(app)/(tabs)/profile");
    expect(HEALTH_HUB_ITEMS.find((i) => i.id === "labs")?.href).toBe("/(app)/labs");
    expect(HEALTH_HUB_ITEMS.find((i) => i.id === "supplements")?.href).toBe(
      CANONICAL_SUPPLEMENTS_HREF,
    );
  });

  it("points Body / Activity / Recovery / Sleep at real module routes", () => {
    expect(HEALTH_HUB_ITEMS.find((i) => i.id === "body")?.href).toBe("/(app)/body");
    expect(HEALTH_HUB_ITEMS.find((i) => i.id === "activity")?.href).toBe("/(app)/activity");
    expect(HEALTH_HUB_ITEMS.find((i) => i.id === "recovery")?.href).toBe("/(app)/recovery");
    expect(HEALTH_HUB_ITEMS.find((i) => i.id === "sleep")?.href).toBe("/(app)/recovery/sleep");
  });
});

describe("resolvePrimaryNavActiveDestination", () => {
  it("selects Today (dash) on /dash", () => {
    expect(resolvePrimaryNavActiveDestination({ pathname: "/dash" })).toBe("dash");
  });

  it("selects Strength on workouts landing (not Dash)", () => {
    expect(resolvePrimaryNavActiveDestination({ pathname: "/workouts" })).toBe("strength");
    expect(resolvePrimaryNavActiveDestination({ pathname: "/workouts/overview" })).toBe(
      "strength",
    );
  });

  it("selects Cardio and Nutrition on their landings", () => {
    expect(resolvePrimaryNavActiveDestination({ pathname: "/cardio" })).toBe("cardio");
    expect(resolvePrimaryNavActiveDestination({ pathname: "/nutrition" })).toBe("nutrition");
  });

  it("selects Health while the menu is open", () => {
    expect(
      resolvePrimaryNavActiveDestination({ pathname: "/dash", healthMenuOpen: true }),
    ).toBe("health");
  });

  it("selects Health on health family pages including body and activity", () => {
    expect(resolvePrimaryNavActiveDestination({ pathname: "/labs" })).toBe("health");
    expect(resolvePrimaryNavActiveDestination({ pathname: "/body" })).toBe("health");
    expect(resolvePrimaryNavActiveDestination({ pathname: "/activity" })).toBe("health");
    expect(resolvePrimaryNavActiveDestination({ pathname: "/recovery" })).toBe("health");
    expect(resolvePrimaryNavActiveDestination({ pathname: "/profile" })).toBe("health");
    expect(resolvePrimaryNavActiveDestination({ pathname: "/nutrition/supplements" })).toBe(
      "health",
    );
  });

  it("does not falsely select Dash on Timeline", () => {
    expect(resolvePrimaryNavActiveDestination({ pathname: "/timeline" })).toBeNull();
  });
});

describe("SECONDARY_EXPLORE_DESTINATIONS", () => {
  it("keeps Timeline, Program, and Library reachable via Settings", () => {
    expect(SECONDARY_EXPLORE_DESTINATIONS.map((d) => d.id)).toEqual([
      "timeline",
      "program",
      "library",
    ]);
  });
});
