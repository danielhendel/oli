import React, { act } from "react";
import { Text } from "react-native";
import renderer from "react-test-renderer";

import {
  DashCompactCardHeader,
  DashCompactProviderSourceChip,
} from "../DashCompactCardHeader";
import { resolveDashMonitorRatingToneChrome } from "@/lib/ui/theme/dashMonitorRatingToneChrome";
import { allowConsoleForThisTest } from "../../../../scripts/test/consoleGuard";

function allText(root: renderer.ReactTestInstance): string {
  return root
    .findAllByType(Text)
    .map((t) => {
      const ch = t.props.children;
      if (typeof ch === "string") return ch;
      if (Array.isArray(ch)) return ch.filter((x): x is string => typeof x === "string").join("");
      return "";
    })
    .join("|");
}

describe("DashCompactCardHeader", () => {
  it("renders title and rating-only badge without nesting Oura in the badge", async () => {
    allowConsoleForThisTest({ error: [/not wrapped in act/] });
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <DashCompactCardHeader
          title="Sleep"
          rating={{
            label: "Optimal",
            tone: "optimal",
            accessibilityLabel: "Rating Optimal.",
          }}
        />,
      );
      await Promise.resolve();
    });
    const flat = allText(tree.root);
    expect(flat).toContain("Sleep");
    expect(flat).toContain("Optimal");
    expect(flat).not.toContain("Oura");
    const badge = tree.root.findByProps({ testID: "dash-compact-rating-badge" });
    const badgeText = allText(badge);
    expect(badgeText).toBe("Optimal");
    expect(badgeText).not.toContain("Oura");
    const chrome = resolveDashMonitorRatingToneChrome("optimal");
    expect(badge.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          backgroundColor: chrome.background,
          borderColor: chrome.border,
        }),
      ]),
    );
    tree.unmount();
  });

  it("omits the badge when rating is null", async () => {
    allowConsoleForThisTest({ error: [/not wrapped in act/] });
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<DashCompactCardHeader title="Activity" rating={null} />);
      await Promise.resolve();
    });
    const flat = allText(tree.root);
    expect(flat).toBe("Activity");
    expect(flat).not.toContain("Optimal");
    expect(() => tree.root.findByProps({ testID: "dash-compact-rating-badge" })).toThrow();
    tree.unmount();
  });

  it("does not treat the rating badge as an interactive control", async () => {
    allowConsoleForThisTest({ error: [/not wrapped in act/] });
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <DashCompactCardHeader
          title="Workout"
          rating={{
            label: "High",
            accessibilityLabel: "Workout intensity High.",
          }}
        />,
      );
      await Promise.resolve();
    });
    const badge = tree.root.findByProps({ testID: "dash-compact-rating-badge" });
    expect(badge.props.accessibilityRole).toBe("text");
    expect(badge.props.accessible).toBe(false);
    tree.unmount();
  });

  it("renders a neutral provider source chip separate from the rating badge", async () => {
    allowConsoleForThisTest({ error: [/not wrapped in act/] });
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <>
          <DashCompactCardHeader
            title="Sleep"
            rating={{
              label: "Fair",
              tone: "caution",
              accessibilityLabel: "Rating Fair.",
            }}
          />
          <DashCompactProviderSourceChip label="Oura" />
        </>,
      );
      await Promise.resolve();
    });
    const badge = tree.root.findByProps({ testID: "dash-compact-rating-badge" });
    const chip = tree.root.findByProps({ testID: "dash-compact-provider-source" });
    expect(allText(badge)).toBe("Fair");
    expect(allText(badge)).not.toContain("Oura");
    expect(allText(chip)).toBe("Oura");
    expect(chip.props.accessibilityLabel).toBe("Source: Oura");
    expect(chip.props.accessible).toBe(false);
    expect(chip.props.accessibilityRole).toBe("text");
    const caution = resolveDashMonitorRatingToneChrome("caution");
    expect(badge.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ backgroundColor: caution.background }),
      ]),
    );
    // Source chip must not inherit caution chrome.
    expect(JSON.stringify(chip.props.style)).not.toContain(caution.background);
    tree.unmount();
  });
});
