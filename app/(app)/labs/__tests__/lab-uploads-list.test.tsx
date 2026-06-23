import React from "react";
import renderer, { act } from "react-test-renderer";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
  useNavigation: () => ({ setOptions: jest.fn(), goBack: jest.fn() }),
}));

jest.mock("@/lib/data/labs/useLabUploads", () => ({
  useLabUploads: () => ({
    status: "ready",
    data: {
      ok: true,
      nextCursor: null,
      items: [
        {
          id: "up1",
          fileName: "labs.pdf",
          storagePath: "lab-uploads/u1/hash/labs.pdf",
          mimeType: "application/pdf",
          uploadedAt: "2025-06-01T12:00:00.000Z",
          status: "parsed",
          extractedCount: 6,
          matchedCount: 5,
          unmatchedCount: 1,
        },
      ],
    },
    refetch: jest.fn(),
  }),
}));

import LabsUploadsListScreen from "../uploads/index";

describe("LabsUploadsListScreen", () => {
  it("renders upload statuses and navigates to detail", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<LabsUploadsListScreen />);
    });

    const row = tree!.root.findByProps({ testID: "lab-upload-row-up1" });
    expect(row).toBeTruthy();
    const text = row.findAllByType(require("react-native").Text).map((t) => t.props.children).join(" ");
    expect(text).toContain("Parsed");
    expect(text).toContain("labs.pdf");

    act(() => {
      row.props.onPress();
    });
    expect(mockPush).toHaveBeenCalledWith("/(app)/labs/uploads/up1");
  });
});
