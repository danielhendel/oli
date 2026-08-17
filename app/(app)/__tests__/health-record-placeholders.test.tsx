import React, { act } from "react";
import renderer from "react-test-renderer";

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("@/lib/ui/navigation/useFloatingTabBarScrollPadding", () => ({
  useFloatingTabBarScrollPadding: (extra: number) => extra + 0,
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));

jest.mock("expo-router", () => ({
  useNavigation: () => ({
    setOptions: jest.fn(),
    goBack: jest.fn(),
  }),
  Redirect: ({ href }: { href: string }) =>
    require("react").createElement("View", { testID: "redirect", href }),
}));

jest.mock("@/lib/ui/HeaderBackButton", () => ({
  HeaderBackButton: "HeaderBackButton",
}));

import ScansPlaceholderScreen from "../scans/index";
import MedicationPlaceholderScreen from "../medication/index";
import SupplementsPlaceholderScreen from "../supplements/index";
import MedicalHistoryPlaceholderScreen from "../medical-history/index";
import DnaPlaceholderScreen from "../dna/index";
import { UI_TEXT_PRIMARY, UI_TEXT_SECONDARY } from "@/lib/ui/theme/uiTokens";

function assertSharedPlaceholder(str: string, opts: { testID: string; action: string }) {
  expect(str).toContain(opts.testID);
  expect(str).toContain("Not set up yet");
  expect(str).toContain("This record system is not implemented yet");
  expect(str).toContain(opts.action);
  expect(str).toContain("Coming soon");
  expect(str).toContain("health-record-placeholder-empty-title");
  // No ModuleScreenShell page title chrome (fontWeight 900 block) for these routes.
  expect(str).not.toMatch(/"fontWeight":"900"/);
  expect(str).toContain(UI_TEXT_PRIMARY);
  expect(str).toContain(UI_TEXT_SECONDARY);
}

describe("Health record placeholder pages", () => {
  it("renders Scans with shared placeholder and no duplicate page heading", async () => {
    let test!: renderer.ReactTestRenderer;
    await act(async () => {
      test = renderer.create(<ScansPlaceholderScreen />);
    });
    const str = JSON.stringify(test.toJSON());
    assertSharedPlaceholder(str, { testID: "scans-placeholder", action: "Add Scan" });
    expect(str).not.toContain("No scans added yet");
    expect(str).not.toMatch(/DEXA|MRI|CT scan result/i);
  });

  it("renders Medication with shared placeholder", async () => {
    let test!: renderer.ReactTestRenderer;
    await act(async () => {
      test = renderer.create(<MedicationPlaceholderScreen />);
    });
    assertSharedPlaceholder(JSON.stringify(test.toJSON()), {
      testID: "medication-placeholder",
      action: "Add Medication",
    });
  });

  it("redirects the Health supplements placeholder to Nutrition supplements", async () => {
    let test!: renderer.ReactTestRenderer;
    await act(async () => {
      test = renderer.create(<SupplementsPlaceholderScreen />);
    });
    const redirect = test.root.findByProps({ testID: "redirect" });
    expect(redirect.props.href).toBe("/(app)/nutrition/supplements");
  });

  it("renders Medical History with shared placeholder", async () => {
    let test!: renderer.ReactTestRenderer;
    await act(async () => {
      test = renderer.create(<MedicalHistoryPlaceholderScreen />);
    });
    assertSharedPlaceholder(JSON.stringify(test.toJSON()), {
      testID: "medical-history-placeholder",
      action: "Add Medical History",
    });
  });

  it("renders DNA with the same shared placeholder contract", async () => {
    let test!: renderer.ReactTestRenderer;
    await act(async () => {
      test = renderer.create(<DnaPlaceholderScreen />);
    });
    const str = JSON.stringify(test.toJSON());
    assertSharedPlaceholder(str, { testID: "dna-placeholder", action: "Add DNA" });
    expect(str).not.toContain("DNA insights coming soon");
  });
});
