import React from "react";
import renderer, { act } from "react-test-renderer";

const mockPush = jest.fn();
let navigationOptions: {
  title?: string;
  headerRight?: () => React.ReactElement;
  headerLeft?: () => React.ReactElement;
} = {};

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn() }),
  useNavigation: () => ({ setOptions: (opts: typeof navigationOptions) => { navigationOptions = opts; }, goBack: jest.fn() }),
}));

const mockSummary = {
  status: "ready" as const,
  data: {
    ok: true as const,
    uploadCount: 0,
    categories: [
      {
        categoryKey: "cardiovascular",
        displayName: "Cardiovascular Health",
        metrics: [
          {
            metricKey: "ldl_c",
            displayName: "LDL-C",
            latestValueText: "92 mg/dL",
            flag: "normal" as const,
          },
        ],
      },
    ],
  },
  refetch: jest.fn(),
};

jest.mock("@/lib/data/labs/useLabsSummary", () => ({
  useLabsSummary: () => mockSummary,
}));

import LabsHomeScreen from "../index";

describe("LabsHomeScreen", () => {
  beforeEach(() => {
    mockPush.mockClear();
    navigationOptions = {};
  });

  it("configures Labs header with back, title, upload and list actions", async () => {
    await act(async () => {
      renderer.create(<LabsHomeScreen />);
      await Promise.resolve();
    });

    expect(navigationOptions.title).toBe("Labs");
    expect(navigationOptions.headerLeft).toBeDefined();
    expect(navigationOptions.headerRight).toBeDefined();

    let headerRightTree!: renderer.ReactTestRenderer;
    await act(async () => {
      headerRightTree = renderer.create(navigationOptions.headerRight!());
    });
    expect(headerRightTree.root.findByProps({ testID: "labs-header-upload" })).toBeTruthy();
    expect(headerRightTree.root.findByProps({ testID: "labs-header-list" })).toBeTruthy();
  });

  it("renders all lab category cards", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<LabsHomeScreen />);
      await Promise.resolve();
    });

    const root = tree.root;
    expect(root.findByProps({ testID: "labs-main-content" })).toBeTruthy();
    expect(root.findByProps({ testID: "labs-category-card-cardiovascular" })).toBeTruthy();
    expect(root.findByProps({ testID: "labs-category-card-metabolic" })).toBeTruthy();
  });

  it("renders metric rows with name, result, and chevron", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<LabsHomeScreen />);
      await Promise.resolve();
    });

    const row = tree.root.findByProps({ testID: "lab-metric-row-ldl_c" });
    expect(row).toBeTruthy();
    const texts = row.findAllByType(require("react-native").Text);
    const joined = texts.map((t: { props: { children?: unknown } }) => t.props.children).join(" ");
    expect(joined).toContain("LDL-C");
    expect(joined).toContain("92 mg/dL");
    expect(joined).toContain("\u203A");
  });
});
