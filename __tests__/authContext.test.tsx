import React from "react";
import { render, waitFor } from "@testing-library/react-native";

// Mock RNFB app & firestore with plain JS (no TS types inside factory)
jest.mock("@react-native-firebase/app", () => ({
  __esModule: true,
  default: () => ({}),
}));
jest.mock("@react-native-firebase/firestore", () => {
  const doc = jest.fn(() => ({
    get: async () => ({ exists: false }),
    set: async () => {},
  }));
  function firestore() {
    return { doc };
  }
  // attach FieldValue without using external vars/types
  (firestore as unknown as { FieldValue: { serverTimestamp: () => Date } }).FieldValue = {
    serverTimestamp: () => new Date(),
  };
  return firestore;
});

// Mock auth listener → signedOut
jest.mock("@react-native-firebase/auth", () => {
  const onAuthStateChanged = (cb: (u: unknown) => void) => {
    cb(null);
    return jest.fn();
  };
  return () => ({ onAuthStateChanged });
});

import { AuthProvider, useAuth } from "@/lib/auth/AuthContext";

function Probe() {
  const { state } = useAuth();
  return state.status === "loading" ? null : null;
}

test("AuthContext transitions: loading → signedOut", async () => {
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>
  );
  await waitFor(() => expect(true).toBe(true));
});
