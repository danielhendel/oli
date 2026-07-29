import React, { act } from "react";
import renderer from "react-test-renderer";

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("@/lib/ui/navigation/useFloatingTabBarScrollPadding", () => ({
  useFloatingTabBarScrollPadding: (extra: number) => extra + 0,
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

import { PrivacyScreenContent } from "@/lib/ui/settings/PrivacyScreenContent";
import { buildUserDataInventoryViewModel } from "@/lib/data/user-data/buildUserDataInventoryViewModel";

describe("Privacy screen honesty", () => {
  it("uses consumer title Privacy without route strings or duplicate page heading", async () => {
    const inventory = buildUserDataInventoryViewModel({ authPresent: true });
    let test!: renderer.ReactTestRenderer;
    await act(async () => {
      test = renderer.create(<PrivacyScreenContent inventory={inventory} />);
    });
    const str = JSON.stringify(test.toJSON());
    expect(str).toContain("privacy-screen");
    expect(str).toContain("privacy-intro");
    expect(str).toContain("Export");
    expect(str).toContain("Delete account");
    expect(str).toContain("not fully covered yet");
    expect(str).toContain("Open Your Data");
    expect(str).not.toContain("settings/privacy");
    expect(str).not.toMatch(/"fontWeight":"900"/);
    expect(str).toContain("privacy-coverage-footnote");
  });
});
