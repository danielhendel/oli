import React, { act } from "react";
import renderer from "react-test-renderer";

import { PublicDocumentLinks } from "@/lib/ui/legal/PublicDocumentLinks";
import type { PublicLinksSnapshot } from "@/lib/config/publicLinks";

const mockOpenPublicLink = jest.fn();

jest.mock("@/lib/linking/openPublicLink", () => ({
  openPublicLink: (...args: unknown[]) => mockOpenPublicLink(...args),
}));

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
  Alert: { alert: jest.fn() },
  StyleSheet: { create: (s: unknown) => s, hairlineWidth: 1 },
}));

const configured: PublicLinksSnapshot = {
  privacyPolicy: { status: "configured", url: "https://docs.oli.health/privacy" },
  termsOfService: { status: "configured", url: "https://docs.oli.health/terms" },
  support: { status: "configured", url: "https://docs.oli.health/support" },
};

const missing: PublicLinksSnapshot = {
  privacyPolicy: { status: "unavailable", reason: "missing" },
  termsOfService: { status: "unavailable", reason: "missing" },
  support: { status: "unavailable", reason: "missing" },
};

const partial: PublicLinksSnapshot = {
  privacyPolicy: { status: "configured", url: "https://docs.oli.health/privacy" },
  termsOfService: { status: "unavailable", reason: "missing" },
  support: { status: "unavailable", reason: "missing" },
};

describe("PublicDocumentLinks", () => {
  beforeEach(() => {
    mockOpenPublicLink.mockReset();
    mockOpenPublicLink.mockResolvedValue({ ok: true });
  });

  it("renders tappable configured links with accessible labels", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(
        <PublicDocumentLinks
          links={configured}
          testID="docs"
          kinds={["privacyPolicy", "termsOfService", "support"]}
        />,
      );
    });

    const privacy = test.root.findByProps({ testID: "docs-privacyPolicy" });
    expect(privacy.props.accessibilityRole).toBe("link");
    expect(privacy.props.accessibilityLabel).toBe("Privacy Policy");
    expect(test.root.findByProps({ testID: "docs-termsOfService" }).props.accessibilityLabel).toBe(
      "Terms of Service",
    );
    expect(test.root.findByProps({ testID: "docs-support" }).props.accessibilityLabel).toBe("Support");
  });

  it("omits document actions entirely when URLs are unavailable (RG-LEGAL-01 open)", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<PublicDocumentLinks links={missing} testID="docs" />);
    });

    expect(test.toJSON()).toBeNull();
    expect(mockOpenPublicLink).not.toHaveBeenCalled();
  });

  it("renders only configured kinds and never invents placeholder destinations", async () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(
        <PublicDocumentLinks
          links={partial}
          testID="docs"
          kinds={["privacyPolicy", "termsOfService", "support"]}
          intro="Review documents."
        />,
      );
    });

    expect(test.root.findByProps({ testID: "docs-privacyPolicy" })).toBeTruthy();
    expect(() => test.root.findByProps({ testID: "docs-termsOfService" })).toThrow();
    expect(() => test.root.findByProps({ testID: "docs-support" })).toThrow();
    expect(JSON.stringify(test.toJSON())).not.toMatch(/example\.com|Coming soon|localhost/i);

    await act(async () => {
      test.root.findByProps({ testID: "docs-privacyPolicy" }).props.onPress();
    });
    expect(mockOpenPublicLink).toHaveBeenCalledWith("privacyPolicy");
  });
});
