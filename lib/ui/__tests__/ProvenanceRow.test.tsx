// lib/ui/__tests__/ProvenanceRow.test.tsx
import React from "react";
import renderer, { act } from "react-test-renderer";

// This repo's Jest env is not a full RN runtime. For simple “rendered text present”
// component tests, we mock RN host components to stable string tags.
jest.mock("react-native", () => {
  return {
    View: "View",
    Text: "Text",
    StyleSheet: {
      create: (styles: unknown) => styles,
    },
  };
});

// IMPORTANT: require AFTER the mock so the module sees mocked react-native
// (avoids ESM/hoist edge cases).
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { ProvenanceRow } = require("../ProvenanceRow") as typeof import("../ProvenanceRow");

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

describe("ProvenanceRow", () => {
  it("renders required provenance fields without dev tools", () => {
    let test!: renderer.ReactTestRenderer;

    act(() => {
      test = renderer.create(
        <ProvenanceRow
          label="Today"
          computedAtIso="2025-12-30T10:00:00.000Z"
          pipelineVersion={1}
          latestCanonicalEventAtIso="2025-12-30T09:59:00.000Z"
          eventsCount={3}
        />,
      );
    });

    const text = collectAllText(test);

    expect(text).toContain("Provenance");
    expect(text).toContain("Today");
    expect(text).toContain("Events:");
    expect(text).toContain("Latest event:");
    expect(text).toContain("Computed:");
    expect(text).toContain("PV:");
    expect(text).toContain("3");
    expect(text).toContain("1");
  });

  it("handles null/unknown provenance safely (fail-closed visibility)", () => {
    let test!: renderer.ReactTestRenderer;

    act(() => {
      test = renderer.create(
        <ProvenanceRow
          computedAtIso={null}
          pipelineVersion={null}
          latestCanonicalEventAtIso={null}
          eventsCount={null}
        />,
      );
    });

    const text = collectAllText(test);

    // Must still render the provenance surface, even when values are unknown.
    expect(text).toContain("Provenance");
    expect(text).toContain("Events:");
    expect(text).toContain("PV:");
  });
});