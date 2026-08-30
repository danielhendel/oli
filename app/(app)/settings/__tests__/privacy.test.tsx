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

const mockIsPublicLinkConfigured = jest.fn(() => false);

jest.mock("@/lib/config/publicLinks", () => ({
  isPublicLinkConfigured: (...args: unknown[]) => mockIsPublicLinkConfigured(...args),
}));

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

import { PrivacyScreenContent } from "@/lib/ui/settings/PrivacyScreenContent";
import { buildUserDataInventoryViewModel } from "@/lib/data/user-data/buildUserDataInventoryViewModel";

describe("Privacy screen honesty", () => {
  beforeEach(() => {
    mockIsPublicLinkConfigured.mockReset();
    mockIsPublicLinkConfigured.mockReturnValue(false);
  });

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
    expect(str).toContain("Deletion coverage");
    expect(str).toContain("Delete Account");
    expect(str).not.toMatch(/\bDelete account\b.*not available in this build/);
    expect(str).toContain("not fully covered yet");
    expect(str).toContain("Open Your Data");
    expect(str).not.toContain("settings/privacy");
    expect(str).not.toMatch(/"fontWeight":"900"/);
    expect(str).toContain("privacy-coverage-footnote");
    expect(str).toContain("privacy-consent-card");
    expect(str).not.toMatch(/You agreed|acceptedAt|Coming soon/i);
  });

  it("omits Documents card when public links are not configured (RG-LEGAL-01 open)", async () => {
    mockIsPublicLinkConfigured.mockReturnValue(false);
    const inventory = buildUserDataInventoryViewModel({ authPresent: true });
    let test!: renderer.ReactTestRenderer;
    await act(async () => {
      test = renderer.create(<PrivacyScreenContent inventory={inventory} />);
    });
    const str = JSON.stringify(test.toJSON());
    expect(str).not.toContain("privacy-documents-card");
    expect(str).not.toContain("privacy-public-links");
    expect(str).not.toMatch(/Coming soon|example\.com/i);
    expect(str).toContain("Open Your Data");
  });

  it("exposes Privacy Policy, Terms, and Support when configured without Export/Delete CTAs", async () => {
    mockIsPublicLinkConfigured.mockReturnValue(true);
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
  });
});
