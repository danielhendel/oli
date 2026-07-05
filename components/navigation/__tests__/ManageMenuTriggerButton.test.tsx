import React, { act } from "react";
import renderer from "react-test-renderer";

import { MANAGE_HUB_ITEMS } from "@/components/navigation/manageHubItems";
import { ManageMenuTriggerButton } from "@/components/navigation/ManageMenuTriggerButton";

const mockOpenManage = jest.fn();

jest.mock("@/components/navigation/ManageNavigationContext", () => ({
  useManageNavigation: () => ({
    manageVisible: false,
    menuAnchor: null,
    openManage: mockOpenManage,
    closeManage: jest.fn(),
  }),
}));

jest.mock("react-native", () => ({
  View: "View",
  Pressable: "Pressable",
  StyleSheet: { create: (s: unknown) => s, hairlineWidth: 1 },
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));

describe("ManageMenuTriggerButton", () => {
  beforeEach(() => {
    mockOpenManage.mockReset();
  });

  it("uses the shared Manage hub accessibility hint", () => {
    let root!: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(<ManageMenuTriggerButton />);
    });

    const button = root.root.findByProps({ testID: "dash-manage-menu-trigger" });
    expect(button.props.accessibilityLabel).toBe("Open navigation menu");
    for (const item of MANAGE_HUB_ITEMS) {
      expect(button.props.accessibilityHint).toContain(item.label);
    }
  });
});

describe("ManageMenuTriggerButton popover wiring", () => {
  it("requests popover presentation when opening manage menu", () => {
    const fs = require("fs");
    const path = require("path");
    const src = fs.readFileSync(
      path.join(__dirname, "../ManageMenuTriggerButton.tsx"),
      "utf8",
    );
    expect(src).toContain('presentation: "popover"');
  });
});
