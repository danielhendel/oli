import React, { act } from "react";
import { Text } from "react-native";
import renderer from "react-test-renderer";

import { DashCompactCardHeader } from "../DashCompactCardHeader";
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
  it("renders title left and rating/source right with a combined rating a11y label", async () => {
    allowConsoleForThisTest({ error: [/not wrapped in act/] });
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <DashCompactCardHeader
          title="Sleep"
          rating={{
            label: "Optimal",
            sourceLabel: "Oura",
            accessibilityLabel: "Oura sleep rating: Optimal",
          }}
        />,
      );
      await Promise.resolve();
    });
    const flat = allText(tree.root);
    expect(flat).toContain("Sleep");
    expect(flat).toContain("Optimal");
    expect(flat).toContain("Oura");
    const badge = tree.root.find(
      (n) =>
        (n.props as { accessibilityLabel?: string }).accessibilityLabel ===
        "Oura sleep rating: Optimal",
    );
    expect(badge).toBeTruthy();
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
    tree.unmount();
  });

  it("does not treat the rating cluster as an interactive control", async () => {
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
    const badge = tree.root.find(
      (n) =>
        (n.props as { accessibilityLabel?: string }).accessibilityLabel ===
        "Workout intensity High.",
    );
    expect(badge.props.accessibilityRole).toBe("text");
    expect(badge.props.accessible).toBe(false);
    tree.unmount();
  });
});
