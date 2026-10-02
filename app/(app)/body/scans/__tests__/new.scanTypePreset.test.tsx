/**
 * @jest-environment jsdom
 */
import React from "react";
import renderer, { act } from "react-test-renderer";

import BodyScanUploadScreen from "@/app/(app)/body/scans/new";

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockSetOptions = jest.fn();
let mockParams: Record<string, string | string[] | undefined> = {};

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: mockBack }),
  useNavigation: () => ({ setOptions: mockSetOptions, goBack: jest.fn() }),
  useLocalSearchParams: () => mockParams,
}));

jest.mock("@/lib/data/body-scans/bodyScansFlag", () => ({
  isBodyScansV1Enabled: () => true,
}));

const mockStartUpload = jest.fn();
let capturedFlowArgs: unknown;

jest.mock("@/lib/data/documents/useDocumentUploadFlow", () => ({
  useDocumentUploadFlow: (args: unknown) => {
    capturedFlowArgs = args;
    return {
      phase: "idle",
      documentId: null,
      errorMessage: null,
      duplicate: false,
      terminalStatus: null,
      reprocessAvailable: false,
      importSummary: null,
      startUpload: mockStartUpload,
      reset: jest.fn(),
      cancel: jest.fn(),
    };
  },
}));

jest.mock("@/lib/ui/HeaderBackButton", () => ({
  HeaderBackButton: () => null,
}));

jest.mock("@/lib/ui/ModuleScreenShell", () => ({
  ModuleScreenShell: ({ children }: { children: React.ReactNode }) => children,
}));

describe("BodyScanUploadScreen category preset", () => {
  beforeEach(() => {
    mockParams = {};
    capturedFlowArgs = undefined;
    mockSetOptions.mockClear();
  });

  it("prefills preferredScanType from query and matches category copy", () => {
    mockParams = { scanType: "inbody" };
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<BodyScanUploadScreen />);
    });
    expect(capturedFlowArgs).toEqual({ domain: "scans", preferredScanType: "inbody" });
    expect(mockSetOptions).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Add InBody scan" }),
    );
    const text = JSON.stringify(tree!.toJSON());
    expect(text).toContain("Add InBody scan");
    expect(text).not.toMatch(/Labs|Quest/i);
  });

  it("prefills each governed category", () => {
    for (const type of ["dxa", "inbody", "evolt", "bod_pod", "other"] as const) {
      mockParams = { scanType: type };
      act(() => {
        renderer.create(<BodyScanUploadScreen />);
      });
      expect(capturedFlowArgs).toEqual({ domain: "scans", preferredScanType: type });
    }
  });

  it("ignores invalid scanType query values", () => {
    mockParams = { scanType: "not-real" };
    act(() => {
      renderer.create(<BodyScanUploadScreen />);
    });
    expect(capturedFlowArgs).toEqual({ domain: "scans" });
  });
});
