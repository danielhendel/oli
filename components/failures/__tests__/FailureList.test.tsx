// components/failures/__tests__/FailureList.test.tsx
//
// Sprint 1.2: Proves the failures UI renders a mocked failure and details.
// Follows lib/ui/__tests__/ProvenanceRow.test.tsx pattern.

import React, { act } from "react";
import renderer from "react-test-renderer";

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
  Modal: "Modal",
  ScrollView: "ScrollView",
  StyleSheet: {
    create: (styles: unknown) => styles,
  },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { FailureList } = require("../FailureList") as typeof import("../FailureList");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { FailureDetailsModal } = require("../FailureDetailsModal") as typeof import("../FailureDetailsModal");

const MOCK_FAILURE = {
  id: "test_failure_001",
  type: "normalization",
  code: "RAW_EVENT_INVALID",
  message: "RawEvent failed contract validation",
  day: "2025-01-15",
  createdAt: "2025-01-15T12:00:00.000Z",
  rawEventId: "raw_test_1",
  details: { formErrors: ["test proof"], fieldErrors: {} },
} as const;

function collectAllText(test: renderer.ReactTestRenderer): string {
  const nodes = test.root.findAllByType("Text");
  const parts: string[] = [];

  for (const n of nodes) {
    for (const child of n.children) {
      if (typeof child === "string" || typeof child === "number") parts.push(String(child));
    }
  }

  return parts.join(" ");
}

describe("FailureList", () => {
  it("renders empty state when no failures", () => {
    let test!: renderer.ReactTestRenderer;

    act(() => {
      test = renderer.create(<FailureList items={[]} />);
    });

    const text = collectAllText(test);
    expect(text).toContain("No failures recorded");
  });

  it("renders mocked failure with code, message, and source", () => {
    let test!: renderer.ReactTestRenderer;

    act(() => {
      test = renderer.create(<FailureList items={[MOCK_FAILURE]} />);
    });

    const text = collectAllText(test);
    expect(text).toContain("Failed");
    expect(text).toContain("RAW_EVENT_INVALID");
    expect(text).toContain("RawEvent failed contract validation");
    expect(text).toContain("normalization");
  });
});

describe("FailureDetailsModal", () => {
  it("renders failure details when given an item", () => {
    let test!: renderer.ReactTestRenderer;

    act(() => {
      test = renderer.create(
        <FailureDetailsModal item={MOCK_FAILURE} onClose={jest.fn()} />,
      );
    });

    const text = collectAllText(test);
    expect(text).toContain("Failure details");
    expect(text).toContain("test_failure_001");
    expect(text).toContain("RAW_EVENT_INVALID");
    expect(text).toContain("RawEvent failed contract validation");
    expect(text).toContain("normalization");
    expect(text).toContain("Close");
  });
});
