// app/(app)/(tabs)/__tests__/library-fail-closed.test.tsx
// Phase 2 — Fail-closed: Library must render ErrorState when retrieval contracts break.

import React from "react";
import renderer, { act } from "react-test-renderer";

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  ScrollView: "ScrollView",
  Pressable: "Pressable",
  TextInput: "TextInput",
  StyleSheet: { create: (s: unknown) => s },
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));

jest.mock("@/lib/data/useRawEvents", () => ({
  useRawEvents: () => ({
    status: "error",
    error: "Invalid response shape",
    requestId: "req-456",
    reason: "contract" as const,
    refetch: jest.fn(),
  }),
}));

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({
    getIdToken: jest.fn().mockResolvedValue(null),
    user: null,
    initializing: false,
  }),
}));

jest.mock("@/lib/api/ingest", () => ({
  ingestRawEventAuthed: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const LibrarySearchScreen = require("../library/search").default;

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

describe("LibrarySearchScreen fail-closed", () => {
  it("renders ErrorState when raw-events API returns error (no partial truth)", () => {
    let test!: renderer.ReactTestRenderer;

    act(() => {
      test = renderer.create(<LibrarySearchScreen />);
    });

    const text = collectAllText(test);
    expect(text).toContain("Something went wrong");
    expect(text).toContain("Try again");
  });

  it("renders ErrorState when retrieval contract breaks (fail-closed, no partial list)", () => {
    let test!: renderer.ReactTestRenderer;

    act(() => {
      test = renderer.create(<LibrarySearchScreen />);
    });

    const text = collectAllText(test);
    expect(text).toContain("Something went wrong");
    expect(text).not.toMatch(/\d+ result/);
  });
});
