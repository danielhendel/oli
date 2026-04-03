import React from "react";
import renderer, { act } from "react-test-renderer";
import { describe, it, expect, jest } from "@jest/globals";
import { Pressable } from "react-native";
import { BodyAppleHealthPermissionCard } from "../BodyAppleHealthPermissionCard";

describe("BodyAppleHealthPermissionCard", () => {
  it("invokes onAllowAccess for connect variant", () => {
    const onAllow = jest.fn();
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <BodyAppleHealthPermissionCard
          variant="connect"
          onAllowAccess={onAllow}
          onOpenSettings={jest.fn()}
        />,
      );
    });
    const pressables = tree.root.findAllByType(Pressable);
    const primary = pressables.find((p) => p.props.accessibilityLabel === "Allow Apple Health access for body data");
    expect(primary).toBeDefined();
    act(() => {
      primary!.props.onPress();
    });
    expect(onAllow).toHaveBeenCalledTimes(1);
  });

  it("invokes onOpenSettings for denied variant", () => {
    const onSettings = jest.fn();
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <BodyAppleHealthPermissionCard
          variant="denied"
          onAllowAccess={jest.fn()}
          onOpenSettings={onSettings}
        />,
      );
    });
    const pressables = tree.root.findAllByType(Pressable);
    const primary = pressables.find(
      (p) => p.props.accessibilityLabel === "Open Settings to enable Apple Health access",
    );
    expect(primary).toBeDefined();
    act(() => {
      primary!.props.onPress();
    });
    expect(onSettings).toHaveBeenCalledTimes(1);
  });
});
