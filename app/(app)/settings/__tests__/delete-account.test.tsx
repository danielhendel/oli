import React, { act } from "react";
import renderer from "react-test-renderer";
import fs from "node:fs";
import path from "node:path";

jest.mock("expo-router", () => ({
  useRouter: () => ({ back: jest.fn(), replace: jest.fn() }),
}));

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  TextInput: "TextInput",
  Pressable: "Pressable",
  ActivityIndicator: "ActivityIndicator",
  StyleSheet: { create: (s: unknown) => s, hairlineWidth: 1 },
}));

jest.mock("@/lib/ui/ModuleScreenShell", () => ({
  ModuleScreenShell: ({ children, title }: { children?: unknown; title?: string }) => {
    const ReactLocal = require("react");
    return ReactLocal.createElement(
      "View",
      { testID: "delete-account-shell" },
      ReactLocal.createElement("Text", null, title),
      children,
    );
  },
}));

import { DeleteAccountScreenContent } from "@/lib/ui/settings/DeleteAccountScreenContent";
import type { AccountDeletionHookResult } from "@/lib/data/user-data/accountDeletion/useAccountDeletion";

function collectText(test: renderer.ReactTestRenderer): string {
  const nodes = test.root.findAllByType("Text");
  const parts: string[] = [];
  for (const n of nodes) {
    for (const child of n.children) {
      if (typeof child === "string" || typeof child === "number") parts.push(String(child));
    }
  }
  return parts.join(" ");
}

const idleDeletion: AccountDeletionHookResult = {
  deletionState: {
    status: "idle",
    requestId: null,
    requestedAt: null,
    retryable: true,
    failureCategory: "none",
  },
  loading: false,
  submitting: false,
  reauthing: false,
  error: null,
  errorRetryable: false,
  deletionAccepted: false,
  refresh: jest.fn(),
  reauthenticate: jest.fn(async () => false),
  submitDeletion: jest.fn(async () => false),
  retryLocalCleanup: jest.fn(async () => undefined),
};

describe("Delete Account consumer copy", () => {
  it("states permanence and async processing without internal governance jargon", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<DeleteAccountScreenContent deletion={idleDeletion} />);
    });
    const text = collectText(test);
    expect(text).toContain("This is permanent");
    expect(text.toLowerCase()).toContain("asynchronous");
    expect(text.toLowerCase()).toContain("operational records may be retained");
    expect(text.toLowerCase()).not.toContain("release legal gate");
    expect(text.toLowerCase()).not.toContain("rg-legal");
    expect(text.toLowerCase()).not.toContain("final legal-retention");
  });

  it("source forbids release-legal-gate consumer phrasing", () => {
    const src = fs.readFileSync(
      path.join(__dirname, "../../../../lib/ui/settings/DeleteAccountScreenContent.tsx"),
      "utf8",
    );
    expect(src.toLowerCase()).not.toContain("release legal gate");
    expect(src.toLowerCase()).not.toContain("final legal-retention copy");
  });
});
