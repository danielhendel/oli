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

jest.mock("@/lib/linking/openPublicLink", () => ({
  openPublicLink: jest.fn(),
}));

import { PrivacyScreenContent } from "@/lib/ui/settings/PrivacyScreenContent";
import { buildUserDataInventoryViewModel } from "@/lib/data/user-data/buildUserDataInventoryViewModel";
import type { PublicLinksSnapshot } from "@/lib/config/publicLinks";

const configuredLinks: PublicLinksSnapshot = {
  privacyPolicy: { status: "configured", url: "https://docs.oli.health/privacy" },
  termsOfService: { status: "configured", url: "https://docs.oli.health/terms" },
  support: { status: "configured", url: "https://docs.oli.health/support" },
};

jest.mock("@/lib/ui/legal/PublicDocumentLinks", () => {
  const ReactLocal = require("react");
  return {
    PublicDocumentLinks: ({ testID, kinds }: { testID?: string; kinds?: string[] }) =>
      ReactLocal.createElement(
        "View",
        { testID: testID ?? "public-document-links" },
        ...(kinds ?? ["privacyPolicy", "termsOfService", "support"]).map((kind: string) =>
          ReactLocal.createElement("Text", { key: kind, testID: `${testID}-${kind}` }, kind),
        ),
      ),
  };
});

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

  it("exposes Privacy Policy, Terms, and Support without Export/Delete CTAs", async () => {
    const inventory = buildUserDataInventoryViewModel({ authPresent: true });
    let test!: renderer.ReactTestRenderer;
    await act(async () => {
      test = renderer.create(<PrivacyScreenContent inventory={inventory} />);
    });
    const str = JSON.stringify(test.toJSON());
    expect(str).toContain("privacy-public-links");
    expect(str).toContain("privacyPolicy");
    expect(str).toContain("termsOfService");
    expect(str).toContain("support");
    expect(str).toContain("Documents");
    expect(str).not.toMatch(/Coming soon|Request export|Delete my account/i);
    expect(configuredLinks.privacyPolicy.status).toBe("configured");
  });
});
