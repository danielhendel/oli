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

describe("PublicDocumentLinks", () => {
  beforeEach(() => {
    mockOpenPublicLink.mockReset();
    mockOpenPublicLink.mockResolvedValue({ ok: true });
  });

  it("renders tappable configured links with accessible labels", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(
        <PublicDocumentLinks links={configured} testID="docs" kinds={["privacyPolicy", "termsOfService", "support"]} />,
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

  it("does not render tappable controls when URLs are unavailable", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<PublicDocumentLinks links={missing} testID="docs" />);
    });

    expect(test.root.findByProps({ testID: "docs-privacyPolicy-unavailable" })).toBeTruthy();
    expect(() => test.root.findByProps({ testID: "docs-privacyPolicy" })).toThrow();
    expect(JSON.stringify(test.toJSON())).toContain("not available right now");
  });
});
