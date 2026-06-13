import React from "react";
import renderer, { act } from "react-test-renderer";

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("expo-camera", () => ({
  useCameraPermissions: () => [{ granted: false, canAskAgain: true }, jest.fn()],
  CameraView: () => null,
}));

jest.mock("expo-haptics", () => ({
  notificationAsync: jest.fn(),
  NotificationFeedbackType: { Success: "success" },
}));

const mockLookup = jest.fn();
jest.mock("@/lib/hooks/useNutritionBarcodeLookup", () => ({
  useNutritionBarcodeLookup: () => ({ lookup: mockLookup }),
}));

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({ day: "2026-03-15" }),
  useNavigation: () => ({ setOptions: jest.fn(), goBack: jest.fn() }),
}));

import NutritionBarcodeScanScreen from "../scan";

describe("NutritionBarcodeScanScreen — attribution & error states", () => {
  beforeEach(() => {
    mockLookup.mockReset();
    mockPush.mockReset();
  });

  it("shows Open Food Facts attribution", async () => {
    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<NutritionBarcodeScanScreen />);
    });
    const flat = JSON.stringify(tree!.toJSON());
    expect(flat).toContain("Open Food Facts");
    expect(flat).toContain("Data © Open Food Facts contributors");
  });

  it("shows a no-match state with a search fallback CTA", async () => {
    mockLookup.mockResolvedValue({ ok: false, error: "No food matched this barcode.", requestId: null });
    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<NutritionBarcodeScanScreen />);
    });
    const root = tree!.root;
    const input = root.findByProps({ accessibilityLabel: "Manual barcode entry" });
    await act(async () => {
      input.props.onChangeText("012345678905");
    });
    const lookupBtn = root.findByProps({ accessibilityLabel: "Look up barcode" });
    await act(async () => {
      lookupBtn.props.onPress();
    });
    const flat = JSON.stringify(tree!.toJSON());
    expect(flat).toContain("No match found");
    expect(flat).toContain("Search by name");
    expect(mockLookup).toHaveBeenCalledWith("012345678905");
  });

  it("shows a network error state with retry", async () => {
    mockLookup.mockResolvedValue({ ok: false, error: "Network request failed", requestId: null });
    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<NutritionBarcodeScanScreen />);
    });
    const root = tree!.root;
    const input = root.findByProps({ accessibilityLabel: "Manual barcode entry" });
    await act(async () => {
      input.props.onChangeText("012345678905");
    });
    const lookupBtn = root.findByProps({ accessibilityLabel: "Look up barcode" });
    await act(async () => {
      lookupBtn.props.onPress();
    });
    const flat = JSON.stringify(tree!.toJSON());
    expect(flat).toContain("Connection problem");
    expect(flat).toContain("Try again");
  });
});
