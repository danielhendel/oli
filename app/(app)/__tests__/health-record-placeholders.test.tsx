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
}));

jest.mock("@/lib/ui/HeaderBackButton", () => ({
  HeaderBackButton: "HeaderBackButton",
}));

import ScansPlaceholderScreen from "../scans/index";
import MedicationPlaceholderScreen from "../medication/index";
import SupplementsPlaceholderScreen from "../supplements/index";
import MedicalHistoryPlaceholderScreen from "../medical-history/index";

describe("temporary Health record landing pages", () => {
  it("renders Scans as not implemented (not empty records)", async () => {
    let test!: renderer.ReactTestRenderer;
    await act(async () => {
      test = renderer.create(<ScansPlaceholderScreen />);
    });
    const str = JSON.stringify(test.toJSON());
    expect(str).toContain("Scans");
    expect(str).toContain("Not set up yet");
    expect(str).toContain("This record system is not implemented yet");
    expect(str).not.toContain("No scans added yet");
    expect(str).toContain("Coming soon");
    expect(str).not.toMatch(/DEXA|MRI|CT scan result/i);
  });

  it("renders Medication as not implemented", async () => {
    let test!: renderer.ReactTestRenderer;
    await act(async () => {
      test = renderer.create(<MedicationPlaceholderScreen />);
    });
    const str = JSON.stringify(test.toJSON());
    expect(str).toContain("Medication");
    expect(str).toContain("Not set up yet");
    expect(str).toContain("This record system is not implemented yet");
    expect(str).not.toContain("No medications added yet");
  });

  it("renders Supplements as not implemented", async () => {
    let test!: renderer.ReactTestRenderer;
    await act(async () => {
      test = renderer.create(<SupplementsPlaceholderScreen />);
    });
    const str = JSON.stringify(test.toJSON());
    expect(str).toContain("Supplements");
    expect(str).toContain("Not set up yet");
    expect(str).not.toContain("No supplements added yet");
  });

  it("renders Medical History as not implemented", async () => {
    let test!: renderer.ReactTestRenderer;
    await act(async () => {
      test = renderer.create(<MedicalHistoryPlaceholderScreen />);
    });
    const str = JSON.stringify(test.toJSON());
    expect(str).toContain("Medical History");
    expect(str).toContain("Not set up yet");
    expect(str).not.toContain("No medical history added yet");
  });
});
