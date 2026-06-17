import React from "react";
import renderer, { act } from "react-test-renderer";

const mockReset = jest.fn();
const mockUpdateEntry = jest.fn();

jest.mock("@/lib/hooks/useBodyWeightLogMutations", () => ({
  useBodyWeightLogMutations: () => ({
    updateEntry: mockUpdateEntry,
    reset: mockReset,
    errorMessage: null,
    isBusy: false,
  }),
}));

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: { uid: "u1" },
    initializing: false,
    getIdToken: jest.fn().mockResolvedValue("token"),
  }),
}));

jest.mock("@/lib/preferences/PreferencesProvider", () => ({
  usePreferences: () => ({
    state: { preferences: { units: { mass: "lb" } } },
  }),
}));

jest.mock("@/lib/api/usersMe", () => ({
  logWeight: jest.fn().mockResolvedValue({ ok: true }),
}));

jest.mock("@/lib/navigation/refreshBus", () => ({
  emitRefresh: jest.fn(),
}));

import { WeightLogModal } from "@/lib/ui/WeightLogModal";

describe("WeightLogModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateEntry.mockResolvedValue({ ok: true });
  });

  it("does not loop updates when rendered closed", async () => {
    await act(async () => {
      renderer.create(
        <WeightLogModal visible={false} onClose={jest.fn()} onSaved={jest.fn()} />,
      );
      await Promise.resolve();
    });
    expect(mockReset).not.toHaveBeenCalled();
  });

  it("resets mutation state once when closing after open", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <WeightLogModal visible onClose={jest.fn()} onSaved={jest.fn()} />,
      );
      await Promise.resolve();
    });
    mockReset.mockClear();
    await act(async () => {
      tree.update(<WeightLogModal visible={false} onClose={jest.fn()} onSaved={jest.fn()} />);
      await Promise.resolve();
    });
    expect(mockReset).toHaveBeenCalledTimes(1);
  });

  it("initializes fields from edit target when opening", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <WeightLogModal
          visible
          onClose={jest.fn()}
          onSaved={jest.fn()}
          editTarget={{
            rawEventId: "w1",
            observedAtIso: "2026-06-06T14:30:00.000Z",
            weightKg: 72.8931,
            bodyFatPercent: 18.5,
          }}
        />,
      );
      await Promise.resolve();
    });
    const inputs = tree.root.findAllByType(require("react-native").TextInput as React.ComponentType);
    const weightInput = inputs.find((node) => node.props.accessibilityLabel === "Weight");
    expect(weightInput?.props.value).toBe("160.7");
    const bfInput = inputs.find((node) => node.props.accessibilityLabel === "Body fat percentage");
    expect(bfInput?.props.value).toBe("18.5");
  });
});
