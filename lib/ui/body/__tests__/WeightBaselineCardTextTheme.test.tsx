import React from "react";
import { StyleSheet } from "react-native";
import renderer, { act } from "react-test-renderer";

import { UI_TEXT_PRIMARY } from "@/lib/ui/theme/uiTokens";
import { WeightBaselineCard } from "@/lib/ui/body/WeightBaselineCard";

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

const points = [{ observedAt: "2026-01-01T10:00:00.000Z", weightKg: 80 }];

describe("WeightBaselineCard text on dark surface", () => {
  it("uses textPrimary for 90 Day insight row labels and values", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <WeightBaselineCard
          unit="lb"
          loading={false}
          error={null}
          chartPoints={points}
          model={{
            kind: "ready",
            currentWeightKg: 80,
            referenceWeightKg: 80,
            ninetyDayLowKg: 78,
            ninetyDayHighKg: 82,
            changeFromReferenceKg: 0,
            classification: "maintaining",
            markerFill01: 0.5,
          }}
        />,
      );
    });
    const lowLabel = tree!.root.findByProps({ children: "90 Day Low" });
    expect(StyleSheet.flatten(lowLabel.props.style).color).toBe(UI_TEXT_PRIMARY);
  });
});
