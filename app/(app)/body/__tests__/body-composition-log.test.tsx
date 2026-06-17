import React from "react";
import renderer, { act } from "react-test-renderer";

const mockSetOptions = jest.fn();
const navigationOptions: Record<string, unknown> = {};

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useNavigation: () => ({
    setOptions: (opts: Record<string, unknown>) => {
      mockSetOptions(opts);
      Object.assign(navigationOptions, opts);
    },
    goBack: jest.fn(),
  }),
}));

jest.mock("@/lib/data/body/useBodyCompositionLog", () => ({
  useBodyCompositionLog: () => ({
    status: "ready",
    entries: [
      {
        rawEventId: "w1",
        observedAt: "2026-06-06T14:30:00.000Z",
        dayKey: "2026-06-06",
        weightKg: 72.8931,
        bodyFatPercent: null,
        provider: "manual",
        sourceId: "manual",
        canEdit: true,
        canDelete: true,
        isImported: false,
        deleteMenuLabel: "Delete",
        editDisabledReason: null,
        deleteDisabledReason: null,
      },
    ],
    error: null,
    requestId: null,
    refetch: jest.fn(),
  }),
}));

jest.mock("@/lib/hooks/useBodyWeightLogMutations", () => ({
  useBodyWeightLogMutations: () => ({
    deleteEntry: jest.fn(async () => ({ ok: true })),
    updateEntry: jest.fn(async () => ({ ok: true })),
    errorMessage: null,
    isBusy: false,
    reset: jest.fn(),
  }),
}));

jest.mock("@/lib/ui/WeightLogModal", () => ({
  WeightLogModal: () => null,
}));

jest.mock("@/lib/preferences/PreferencesProvider", () => ({
  usePreferences: () => ({ state: { preferences: { units: { mass: "lb" } } } }),
}));

import BodyCompositionLogScreen from "../list";

describe("BodyCompositionLogScreen", () => {
  it("renders weight rows with exact decimals and row menu affordance", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<BodyCompositionLogScreen />);
      await Promise.resolve();
    });
    const row = tree.root.findByProps({ testID: "body-composition-log-row-w1" });
    expect(row).toBeDefined();
    expect(tree.root.findByProps({ children: "June 6, 2026" })).toBeDefined();
    expect(tree.root.findByProps({ children: "Weight 160.7 lb" })).toBeDefined();
  });
});
