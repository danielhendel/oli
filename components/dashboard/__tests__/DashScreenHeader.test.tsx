import React, { act } from "react";
import renderer from "react-test-renderer";

import { MANAGE_HUB_ITEMS } from "@/components/navigation/manageHubItems";
import { DashScreenHeader } from "@/components/dashboard/DashScreenHeader";

const mockPush = jest.fn();
const mockOpenManage = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("@/components/navigation/ManageNavigationContext", () => ({
  useManageNavigation: () => ({
    manageVisible: false,
    menuAnchor: null,
    openManage: mockOpenManage,
    closeManage: jest.fn(),
  }),
}));

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: { uid: "u1", displayName: "Daniel H", email: "daniel@example.com" },
    initializing: false,
  }),
}));

jest.mock("@/lib/data/profile/useUserProfileMain", () => ({
  useUserProfileMain: () => ({
    state: {
      status: "ready",
      profile: {
        identity: { firstName: "Daniel", lastName: null, dateOfBirth: null, sexAtBirth: null },
      },
    },
  }),
}));

jest.mock("react-native/Libraries/Utilities/useWindowDimensions", () => ({
  __esModule: true,
  default: () => ({ width: 390, height: 844, scale: 3, fontScale: 1 }),
}));

describe("DashScreenHeader", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockOpenManage.mockReset();
  });

  it("renders centered Oli Fitness title without standalone Oli header", () => {
    let root!: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(<DashScreenHeader />);
    });

    const text = root.root
      .findAllByType("Text")
      .map((n) =>
        (n.children as (string | number)[])
          .filter((c) => typeof c === "string" || typeof c === "number")
          .join(""),
      )
      .join(" ");

    expect(text).toContain("Oli Fitness");
    expect(text).not.toMatch(/\bOli\b(?! Fitness)/);
  });

  it("renders user initial settings button with profile initial", () => {
    let root!: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(<DashScreenHeader />);
    });

    const initialButton = root.root.findByProps({ testID: "user-initial-settings-button" });
    expect(initialButton.props.accessibilityLabel).toBe("Open Daniel's settings");
    expect(initialButton.props.accessibilityHint).toContain("settings");

    act(() => {
      initialButton.props.onPress();
    });
    expect(mockPush).toHaveBeenCalledWith("/(app)/settings");
  });

  it("renders hamburger trigger wired to Manage navigation", () => {
    let root!: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(<DashScreenHeader />);
    });

    const menuTrigger = root.root.findByProps({ testID: "dash-manage-menu-trigger" });
    expect(menuTrigger.props.accessibilityLabel).toBe("Open navigation menu");
    expect(menuTrigger.props.accessibilityHint).toContain(MANAGE_HUB_ITEMS[0]!.label);
  });
});
