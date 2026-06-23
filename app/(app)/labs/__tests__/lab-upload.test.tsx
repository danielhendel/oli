import React from "react";
import renderer, { act } from "react-test-renderer";

const mockPickAndUpload = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
  useNavigation: () => ({ setOptions: jest.fn(), goBack: jest.fn() }),
}));

jest.mock("@/lib/data/labs/useLabUploadFlow", () => ({
  useLabUploadFlow: () => ({
    state: { phase: "idle", uploadId: null, error: null, fileName: null },
    pickAndUpload: mockPickAndUpload,
    reset: jest.fn(),
    documentPickerAvailability: "available",
  }),
}));

import LabsUploadScreen from "../upload";

describe("LabsUploadScreen", () => {
  it("shows privacy copy and PDF pick button", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<LabsUploadScreen />);
    });

    expect(tree!.root.findByProps({ testID: "lab-upload-privacy-note" })).toBeTruthy();
    expect(tree!.root.findByProps({ testID: "lab-upload-pick-pdf" })).toBeTruthy();
  });

  it("invokes pick flow on press", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<LabsUploadScreen />);
    });

    const button = tree!.root.findByProps({ testID: "lab-upload-pick-pdf" });
    act(() => {
      button.props.onPress();
    });
    expect(mockPickAndUpload).toHaveBeenCalled();
  });
});
