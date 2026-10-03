import React from "react";
import renderer, { act } from "react-test-renderer";
import { RefreshControl, ScrollView, Text } from "react-native";

import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";

describe("ModuleScreenShell refresh", () => {
  it("enables vertical bounce when refreshControl is provided so pull-to-refresh can engage", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <ModuleScreenShell
          title="Test"
          refreshControl={<RefreshControl refreshing={false} onRefresh={jest.fn()} />}
        >
          <Text>Body</Text>
        </ModuleScreenShell>,
      );
      await Promise.resolve();
    });
    const scroll = tree!.root.findByType(ScrollView);
    expect(scroll.props.alwaysBounceVertical).toBe(true);
  });

  it("defaults to ScrollView body (scrollable)", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <ModuleScreenShell title="Test">
          <Text>Body</Text>
        </ModuleScreenShell>,
      );
    });
    expect(tree!.root.findAllByType(ScrollView)).toHaveLength(1);
  });

  it("bodyScrollEnabled=false uses plain View — no ScrollView around children", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <ModuleScreenShell title="Test" hideTitleChrome bodyScrollEnabled={false}>
          <Text>Body</Text>
        </ModuleScreenShell>,
      );
    });
    expect(tree!.root.findAllByType(ScrollView)).toHaveLength(0);
  });
});
