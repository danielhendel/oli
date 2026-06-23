import React from "react";
import { Text } from "react-native";
import renderer, { act } from "react-test-renderer";

const mockProbe = jest.fn();
const mockPick = jest.fn();

jest.mock("@/lib/labs/expoDocumentPicker", () => ({
  DOCUMENT_PICKER_UNAVAILABLE_MESSAGE:
    "Labs Upload requires a new development build. Rebuild the app to enable PDF uploads.",
  probeExpoDocumentPickerAvailability: (...args: unknown[]) => mockProbe(...args),
  pickLabPdfDocument: (...args: unknown[]) => mockPick(...args),
}));

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({ getIdToken: async () => "token" }),
}));

jest.mock("@/lib/api/labs", () => ({
  createLabUpload: jest.fn(),
}));

import { useLabUploadFlow } from "@/lib/data/labs/useLabUploadFlow";

function ProbeHost({
  onReady,
}: {
  onReady?: (flow: ReturnType<typeof useLabUploadFlow>) => void;
}) {
  const flow = useLabUploadFlow();
  onReady?.(flow);
  return <Text testID="availability">{flow.documentPickerAvailability}</Text>;
}

describe("useLabUploadFlow document picker probe", () => {
  beforeEach(() => {
    mockProbe.mockReset();
    mockPick.mockReset();
  });

  it("starts checking then becomes available after probe succeeds", async () => {
    mockProbe.mockResolvedValue(true);

    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<ProbeHost />);
      await Promise.resolve();
    });

    expect(mockProbe).toHaveBeenCalled();
    expect(tree!.root.findByProps({ testID: "availability" }).props.children).toBe("available");
  });

  it("becomes unavailable when dynamic import probe fails", async () => {
    mockProbe.mockResolvedValue(false);

    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<ProbeHost />);
      await Promise.resolve();
    });

    expect(tree!.root.findByProps({ testID: "availability" }).props.children).toBe("unavailable");
  });

  it("lazy-imports picker on Pick PDF and surfaces unavailable when pick fails", async () => {
    mockProbe.mockResolvedValue(true);
    mockPick.mockResolvedValue({ status: "unavailable" });

    let flowRef: ReturnType<typeof useLabUploadFlow> | undefined;
    await act(async () => {
      renderer.create(<ProbeHost onReady={(flow) => { flowRef = flow; }} />);
      await Promise.resolve();
    });

    await act(async () => {
      await flowRef!.pickAndUpload();
    });

    expect(mockPick).toHaveBeenCalled();
    expect(flowRef!.documentPickerAvailability).toBe("unavailable");
    expect(flowRef!.state.phase).toBe("error");
    expect(flowRef!.state.error).toContain("development build");
  });
});
