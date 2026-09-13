import React from "react";
import { create, act } from "react-test-renderer";

import { OpeningScreenContent } from "@/lib/ui/onboarding/OpeningScreenContent";
import { AboutYouScreenContent } from "@/lib/ui/onboarding/AboutYouScreenContent";
import { ConnectSourcesScreenContent } from "@/lib/ui/onboarding/ConnectSourcesScreenContent";
import { emptyAboutYouDraft } from "@/lib/onboarding/onboardingDraftStorage";

jest.mock("@/lib/ui/onboarding/OnboardingOwnershipMenu", () => ({
  OnboardingOwnershipMenu: () => null,
}));

function flattenText(node: unknown): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join(" ");
  if (typeof node === "object" && node !== null && "children" in node) {
    return flattenText((node as { children?: unknown }).children);
  }
  if (typeof node === "object" && node !== null && "props" in node) {
    const props = (node as { props?: { children?: unknown } }).props;
    return flattenText(props?.children);
  }
  return "";
}

describe("onboarding screen copy and DOB structure", () => {
  it("Opening shows approved leadership copy", () => {
    let tree: ReturnType<typeof create> | undefined;
    act(() => {
      tree = create(
        <OpeningScreenContent onGetStarted={() => undefined} onSignIn={() => undefined} />,
      );
    });
    const text = flattenText(tree!.toJSON());
    expect(text).toContain("Pursue Health Excellence.");
    expect(text).toContain("Know where you are.");
    expect(text).toContain("Know what to do.");
    expect(text).toContain("Discover how great you can become.");
    expect(text).not.toContain("Pursue Excellence.");
    expect(text).not.toContain("Understand where you are.");
  });

  it("About You has Month/Day/Year and no old subtitle", () => {
    let tree: ReturnType<typeof create> | undefined;
    act(() => {
      tree = create(
        <AboutYouScreenContent
          draft={emptyAboutYouDraft()}
          errors={{}}
          submitting={false}
          bannerError={null}
          onChange={() => undefined}
          onSubmit={() => undefined}
        />,
      );
    });
    const text = flattenText(tree!.toJSON());
    expect(text).toContain("Let’s get to know you.");
    expect(text).toContain("Date of birth");
    expect(text).toContain("Month");
    expect(text).toContain("Day");
    expect(text).toContain("Year");
    expect(text).not.toContain(
      "Only information required to interpret health and performance data correctly.",
    );
    expect(text).not.toContain("YYYY-MM-DD");
  });

  it("Connect shows Continue and I’ll do this later", () => {
    let tree: ReturnType<typeof create> | undefined;
    act(() => {
      tree = create(
        <ConnectSourcesScreenContent
          apple={{ id: "apple_health", status: "idle" }}
          oura={{ id: "oura", status: "idle" }}
          advancing={false}
          bannerError={null}
          onConnectApple={() => undefined}
          onConnectOura={() => undefined}
          onContinue={() => undefined}
          onLater={() => undefined}
        />,
      );
    });
    const text = flattenText(tree!.toJSON());
    expect(text).toContain("Continue");
    expect(text).toContain("I’ll do this later");
    expect(text).toContain("Apple Health");
    expect(text).toContain("Oura");
  });
});
