import React from "react";
import renderer, { act } from "react-test-renderer";
import { Keyboard, Platform, Text } from "react-native";

import { useBodyMetricEntryKeyboard } from "@/lib/hooks/useBodyMetricEntryKeyboard";

function Probe(props: { enabled: boolean }) {
  const state = useBodyMetricEntryKeyboard(props.enabled);
  return (
    <Text testID="kb-probe">
      {`${state.keyboardHeight}:${state.keyboardVisible ? "1" : "0"}`}
    </Text>
  );
}

describe("useBodyMetricEntryKeyboard", () => {
  const subs: { event: string; cb: (e?: unknown) => void; remove: jest.Mock }[] = [];

  beforeEach(() => {
    subs.length = 0;
    jest.spyOn(Keyboard, "addListener").mockImplementation((event, cb) => {
      const entry = { event, cb: cb as (e?: unknown) => void, remove: jest.fn() };
      subs.push(entry);
      return { remove: entry.remove } as never;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("starts at zero, tracks show, and resets when disabled", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<Probe enabled />);
    });
    expect(tree.root.findByProps({ testID: "kb-probe" }).props.children).toBe("0:0");

    await act(async () => {
      subs.find((s) => s.event.includes("Show"))?.cb({ endCoordinates: { height: 280 } });
    });
    expect(tree.root.findByProps({ testID: "kb-probe" }).props.children).toBe("280:1");

    await act(async () => {
      tree.update(<Probe enabled={false} />);
    });
    expect(tree.root.findByProps({ testID: "kb-probe" }).props.children).toBe("0:0");
  });

  it("hide resets height so resting layout has no stale offset", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<Probe enabled />);
    });
    await act(async () => {
      subs.find((s) => s.event.includes("Show"))?.cb({ endCoordinates: { height: 300 } });
    });
    expect(tree.root.findByProps({ testID: "kb-probe" }).props.children).toBe("300:1");
    await act(async () => {
      subs.find((s) => s.event.includes("Hide"))?.cb();
    });
    expect(tree.root.findByProps({ testID: "kb-probe" }).props.children).toBe("0:0");
  });

  it("registers platform-appropriate keyboard events only once each", async () => {
    await act(async () => {
      renderer.create(<Probe enabled />);
    });
    const events = subs.map((s) => s.event);
    if (Platform.OS === "ios") {
      expect(events).toEqual(["keyboardWillShow", "keyboardWillHide"]);
    } else {
      expect(events).toEqual(["keyboardDidShow", "keyboardDidHide"]);
    }
  });
});
