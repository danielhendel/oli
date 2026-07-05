import React, { act } from "react";
import renderer from "react-test-renderer";

import { UserInitialSettingsButton } from "@/lib/ui/UserInitialSettingsButton";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: { uid: "u1", displayName: null, email: "daniel@example.com" },
  }),
}));

jest.mock("@/lib/data/profile/useUserProfileMain", () => ({
  useUserProfileMain: () => ({
    state: { status: "missing" },
  }),
}));

describe("UserInitialSettingsButton", () => {
  beforeEach(() => {
    mockPush.mockReset();
  });

  it("derives initial from email when profile name is missing", () => {
    let root!: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(<UserInitialSettingsButton />);
    });

    const label = root.root.findByType("Text");
    expect(label.props.children).toBe("D");

    const button = root.root.findByProps({ testID: "user-initial-settings-button" });
    act(() => {
      button.props.onPress();
    });
    expect(mockPush).toHaveBeenCalledWith("/(app)/settings");
  });
});
