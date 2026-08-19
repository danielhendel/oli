import {
  PRIMARY_NAV_FORBIDDEN_LABELS,
  PRIMARY_NAVIGATION_ITEMS,
  PRIMARY_PILL_ITEMS,
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
import { YOU_HUB_ALL_ITEMS } from "@/lib/navigation/youHubItems";

describe("primaryNavHealthV1 flag (deprecated)", () => {
  afterEach(() => {
    setPrimaryNavHealthV1EnabledForTests(null);
    delete process.env.EXPO_PUBLIC_PRIMARY_NAV_HEALTH_V1;
  });

  it("defaults to enabled when unset", () => {
    delete process.env.EXPO_PUBLIC_PRIMARY_NAV_HEALTH_V1;
    setPrimaryNavHealthV1EnabledForTests(null);
    expect(isPrimaryNavHealthV1Enabled()).toBe(true);
  });

  it("still parses historical env values without controlling the dock", () => {
    process.env.EXPO_PUBLIC_PRIMARY_NAV_HEALTH_V1 = "0";
    setPrimaryNavHealthV1EnabledForTests(null);
    expect(isPrimaryNavHealthV1Enabled()).toBe(false);
    expect(PRIMARY_NAVIGATION_ITEMS.map((i) => i.label)).toEqual([
      "Home",
      "Plan",
      "Progress",
      "You",
    ]);
  });
});

describe("PRIMARY_NAVIGATION_ITEMS contract", () => {
  it("has exactly Home, Plan, Progress, You", () => {
    expect(PRIMARY_NAVIGATION_ITEMS.map((i) => i.label)).toEqual([
      "Home",
      "Plan",
      "Progress",
      "You",
    ]);
    expect(PRIMARY_NAVIGATION_ITEMS.map((i) => i.id)).toEqual([
      "home",
      "plan",
      "progress",
      "you",
    ]);
    expect(PRIMARY_NAVIGATION_ITEMS).toHaveLength(4);
  });

  it("keeps all four destinations in the pill with no detached fifth control", () => {
    expect(PRIMARY_PILL_ITEMS).toEqual(PRIMARY_NAVIGATION_ITEMS);
    expect(PRIMARY_NAVIGATION_ITEMS.every((i) => i.action.kind === "tab")).toBe(true);
  });

  it("does not use forbidden primary labels", () => {
    const labels = new Set(PRIMARY_NAVIGATION_ITEMS.map((i) => i.label));
    for (const forbidden of PRIMARY_NAV_FORBIDDEN_LABELS) {
      expect(labels.has(forbidden)).toBe(false);
    }
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
  it("exposes real capabilities only", () => {
    expect(HEALTH_HUB_ITEMS.map((i) => i.label)).toEqual([
      "Profile",
      "Body",
      "Movement",
      "Recovery",
      "Sleep",
      "Labs",
      "Supplements",
    ]);
  });

  it("excludes launch-facing placeholders", () => {
    const labels = new Set(HEALTH_HUB_ITEMS.map((i) => i.label));
    for (const forbidden of HEALTH_HUB_FORBIDDEN_LABELS) {
      expect(labels.has(forbidden)).toBe(false);
    }
  });

  it("points Movement to the Activity route and Supplements to Nutrition", () => {
    expect(HEALTH_HUB_ITEMS.find((i) => i.id === "movement")?.href).toBe("/(app)/activity");
    expect(HEALTH_HUB_ITEMS.find((i) => i.id === "supplements")?.href).toBe(
      "/(app)/nutrition/supplements",
    );
  });
});

describe("resolvePrimaryNavActiveDestination", () => {
  it("selects Home on /dash", () => {
    expect(resolvePrimaryNavActiveDestination({ pathname: "/dash" })).toBe("home");
  });

  it("selects Plan on program", () => {
    expect(resolvePrimaryNavActiveDestination({ pathname: "/program" })).toBe("plan");
  });

  it("selects Progress on progress and timeline", () => {
    expect(resolvePrimaryNavActiveDestination({ pathname: "/progress" })).toBe("progress");
    expect(resolvePrimaryNavActiveDestination({ pathname: "/timeline" })).toBe("progress");
  });

  it("selects You on profile, settings, and Library", () => {
    expect(resolvePrimaryNavActiveDestination({ pathname: "/you" })).toBe("you");
    expect(resolvePrimaryNavActiveDestination({ pathname: "/profile" })).toBe("you");
    expect(resolvePrimaryNavActiveDestination({ pathname: "/labs" })).toBe("you");
    expect(resolvePrimaryNavActiveDestination({ pathname: "/library" })).toBe("you");
    expect(resolvePrimaryNavActiveDestination({ focusedTabName: "library" })).toBe("you");
    expect(resolvePrimaryNavActiveDestination({ focusedTabName: "profile" })).toBe("you");
  });

  it("selects Progress when the hidden Timeline tab is focused", () => {
    expect(resolvePrimaryNavActiveDestination({ focusedTabName: "timeline" })).toBe("progress");
  });

  it("selects Home on domain current-state routes, not Strength/Cardio/Nutrition", () => {
    expect(resolvePrimaryNavActiveDestination({ pathname: "/workouts" })).toBe("home");
    expect(resolvePrimaryNavActiveDestination({ pathname: "/cardio" })).toBe("home");
    expect(resolvePrimaryNavActiveDestination({ pathname: "/nutrition" })).toBe("home");
  });

  it("ignores healthMenuOpen so Health cannot become a fifth destination", () => {
    expect(
      resolvePrimaryNavActiveDestination({ pathname: "/dash", healthMenuOpen: true }),
    ).toBe("home");
  });
});

describe("SECONDARY_EXPLORE_DESTINATIONS", () => {
  it("keeps Timeline and Library reachable without a Program dock item", () => {
    expect(SECONDARY_EXPLORE_DESTINATIONS.map((d) => d.id)).toEqual(["timeline", "library"]);
  });
});

describe("You hub discoverability", () => {
  it("keeps Profile, devices, assessments, labs, privacy, settings, and failures", () => {
    const ids = YOU_HUB_ALL_ITEMS.map((i) => i.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "profile",
        "devices",
        "assessments",
        "labs",
        "privacy",
        "settings",
        "failures",
      ]),
    );
  });
});
