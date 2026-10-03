/**
 * @jest-environment jsdom
 */
import React from "react";
import renderer, { act } from "react-test-renderer";

import BodyScanCategoryHistoryScreen from "@/app/(app)/body/scans/type/[scanType]";

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockSetOptions = jest.fn();
let mockParams: Record<string, string | string[] | undefined> = { scanType: "dxa" };
const mockLoadMore = jest.fn();
const mockRefetch = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: jest.fn() }),
  useNavigation: () => ({ setOptions: mockSetOptions, goBack: jest.fn() }),
  useLocalSearchParams: () => mockParams,
}));

jest.mock("@react-navigation/native", () => ({
  useFocusEffect: (cb: () => void) => {
    cb();
  },
}));

jest.mock("@/lib/data/body-scans/bodyScansFlag", () => ({
  isBodyScansV1Enabled: () => true,
}));

jest.mock("@/lib/data/body-scans/useBodyScanCategoryHistory", () => ({
  useBodyScanCategoryHistory: () => ({
    status: "ready",
    items: [
      {
        id: "d1",
        scanType: "dxa",
        method: "dxa",
        status: "needs_review",
        performedAt: "2026-09-27T12:00:00.000Z",
        uploadedAt: "2026-09-28T12:00:00.000Z",
        deviceLabel: "GE Lunar",
        statusLabel: "Review the extracted results before saving.",
        metricCount: 2,
        canReview: true,
        canRetry: false,
        canDelete: true,
        canViewOriginal: true,
      },
    ],
    nextCursor: null,
    hasMore: false,
    refetch: mockRefetch,
    loadMore: mockLoadMore,
    loadingMore: false,
    loadMoreError: null,
    isProvenEmpty: false,
  }),
}));

jest.mock("@/lib/ui/HeaderBackButton", () => ({
  HeaderBackButton: () => null,
}));

const mockShellProps: { bodyScrollEnabled?: boolean }[] = [];
jest.mock("@/lib/ui/ModuleScreenShell", () => ({
  ModuleScreenShell: ({
    children,
    bodyScrollEnabled,
  }: {
    children: React.ReactNode;
    bodyScrollEnabled?: boolean;
  }) => {
    mockShellProps.push({ bodyScrollEnabled });
    return children;
  },
}));

describe("BodyScanCategoryHistoryScreen", () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockPush.mockClear();
    mockSetOptions.mockClear();
    mockShellProps.length = 0;
    mockParams = { scanType: "dxa" };
  });

  it("opts out of shell ScrollView so FlatList owns vertical scrolling", () => {
    act(() => {
      renderer.create(<BodyScanCategoryHistoryScreen />);
    });
    expect(mockShellProps.some((p) => p.bodyScrollEnabled === false)).toBe(true);
  });

  it("renders DXA history and opens scan detail", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<BodyScanCategoryHistoryScreen />);
    });
    expect(mockSetOptions).toHaveBeenCalledWith(
      expect.objectContaining({ title: "DXA Scans" }),
    );
    const row = tree!.root.findByProps({ testID: "body-scan-history-row-d1" });
    act(() => {
      row.props.onPress();
    });
    expect(mockPush).toHaveBeenCalledWith("/(app)/body/scans/d1");
  });

  it("fail-closes invalid scanType to the Body Scans hub", () => {
    mockParams = { scanType: "not-a-category" };
    act(() => {
      renderer.create(<BodyScanCategoryHistoryScreen />);
    });
    expect(mockReplace).toHaveBeenCalledWith("/(app)/body/scans");
  });

  it("Add opens upload with scanType preselected", () => {
    act(() => {
      renderer.create(<BodyScanCategoryHistoryScreen />);
    });
    const headerRight = mockSetOptions.mock.calls.at(-1)?.[0]?.headerRight;
    expect(typeof headerRight).toBe("function");
    let addTree: renderer.ReactTestRenderer;
    act(() => {
      addTree = renderer.create(headerRight());
    });
    act(() => {
      addTree!.root.findByProps({ testID: "body-scan-category-header-add" }).props.onPress();
    });
    expect(mockPush).toHaveBeenCalledWith("/(app)/body/scans/new?scanType=dxa");
  });
});
