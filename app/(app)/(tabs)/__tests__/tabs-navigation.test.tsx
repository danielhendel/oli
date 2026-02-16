// app/(app)/(tabs)/__tests__/tabs-navigation.test.tsx
// Sprint 3 — Navigation: tabs layout has 5 tabs in correct order, Dash is initial route.

import React from "react";
import renderer, { act } from "react-test-renderer";

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
  StyleSheet: { create: (s: unknown) => s },
}));

jest.mock("@expo/vector-icons/Ionicons", () => "Ionicons");

jest.mock("expo-router", () => {
  const MockTabs = ({ children, initialRouteName }: { children?: React.ReactNode; initialRouteName?: string }) => {
    const React = require("react");
    return React.createElement(
      "View",
      { "data-initial-route": initialRouteName, "data-testid": "tabs" },
      children,
    );
  };
  MockTabs.Screen = ({ name, options }: { name: string; options?: { title?: string } }) =>
    require("react").createElement("View", {
      "data-tab-name": name,
      "data-tab-title": options?.title ?? name,
    });
  return {
    Tabs: MockTabs,
    useRouter: () => ({ push: jest.fn() }),
  };
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
const TabsLayout = require("../_layout").default;

function findTabs(test: renderer.ReactTestRenderer): { name: string; title: string }[] {
  const tabs: { name: string; title: string }[] = [];
  const find = (node: renderer.ReactTestInstance) => {
    const p = node.props;
    if (p && "data-tab-name" in p) {
      tabs.push({
        name: p["data-tab-name"] as string,
        title: (p["data-tab-title"] as string) ?? "",
      });
    }
    node.children.forEach((c) => {
      if (typeof c === "object" && c !== null && "children" in c) find(c as renderer.ReactTestInstance);
    });
  };
  find(test.root);
  return tabs;
}

describe("TabsLayout", () => {
  it("has initialRouteName dash", () => {
    let test!: renderer.ReactTestRenderer;

    act(() => {
      test = renderer.create(<TabsLayout />);
    });

    const tabsNode = test.root.findByProps({ "data-testid": "tabs" });
    expect(tabsNode.props["data-initial-route"]).toBe("dash");
  });

  it("has 5 visible tabs in order: Dash, Timeline, Manage, Library, Stats", () => {
    let test!: renderer.ReactTestRenderer;

    act(() => {
      test = renderer.create(<TabsLayout />);
    });

    const tabs = findTabs(test);
    const visibleTabs = tabs.filter(
      (t) => t.name !== "index" && t.title && t.title !== "",
    );
    const titles = visibleTabs.map((t) => t.title);

    expect(titles).toContain("Library");
    expect(titles).toContain("Manage");
    expect(titles).toContain("Timeline");
    expect(titles).toContain("Stats");
    expect(titles).toContain("Dash");
    expect(titles.indexOf("Dash")).toBeLessThan(titles.indexOf("Timeline"));
    expect(titles.indexOf("Timeline")).toBeLessThan(titles.indexOf("Manage"));
    expect(titles.indexOf("Manage")).toBeLessThan(titles.indexOf("Library"));
    expect(titles.indexOf("Library")).toBeLessThan(titles.indexOf("Stats"));
  });
});
