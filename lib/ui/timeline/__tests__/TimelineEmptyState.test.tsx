import React from "react";
import { act } from "react-test-renderer";
import renderer from "react-test-renderer";

import { TimelineEmptyState } from "@/lib/ui/timeline/TimelineEmptyState";

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  StyleSheet: { create: (s: unknown) => s },
}));

describe("TimelineEmptyState", () => {
  it("shows today plan-ready copy", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<TimelineEmptyState isToday />);
    });
    const str = JSON.stringify(test.toJSON());
    expect(str).toContain("Nothing logged yet today");
    expect(str).toContain("Your plan is ready");
  });
});
