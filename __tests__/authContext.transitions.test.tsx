// __tests__/authContext.transitions.test.tsx
import React from "react";
import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";

/**
 * RNFB auth mock with INTERNAL state (inside the factory).
 * Tests set the user via default.__setUser(user).
 */
jest.mock("@react-native-firebase/auth", () => {
  let user: any = null; // stays INSIDE the factory -> no scoping error
  const authImpl = () => ({
    onAuthStateChanged: (cb: (u: any) => void) => {
      cb(user);
      return () => {};
    },
  });
  (authImpl as any).__setUser = (u: any) => {
    user = u;
  };
  return { __esModule: true, default: authImpl };
});

// Prevent native module loads for app/firestore (used by provision)
jest.mock("@react-native-firebase/app", () => ({ __esModule: true, default: () => ({}) }));
jest.mock("@react-native-firebase/firestore", () => {
  const serverTimestamp = () => ({ __ts: "server" });
  const noop = jest.fn();
  const docObj = { get: jest.fn().mockResolvedValue({ exists: true }), set: noop };
  const collection = jest.fn(() => ({ doc: jest.fn(() => docObj) }));
  const firestore = () =>
    ({ collection, doc: jest.fn(() => docObj), FieldValue: { serverTimestamp } } as any);
  (firestore as any).FieldValue = { serverTimestamp };
  return { __esModule: true, default: firestore, FirebaseFirestoreTypes: {} };
});

// Import AFTER mocks
import { AuthProvider, useAuth } from "@/lib/auth/AuthContext";

function Probe() {
  const { state } = useAuth();
  return <Text testID="authstate">{state.status}</Text>;
}

describe("AuthContext transitions", () => {
  afterEach(() => {
    // Reset to signedOut and clear spies between tests
    const authMod = require("@react-native-firebase/auth").default as any;
    authMod.__setUser(null);
    jest.clearAllMocks();
  });

  it("goes loading → signedOut", async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    const el = await screen.findByTestId("authstate");
    expect(el).toHaveTextContent("signedOut");
  });

  it("goes loading → signedIn when user provided", async () => {
    // Set user BEFORE rendering so onAuthStateChanged sees it
    const authMod = require("@react-native-firebase/auth").default as any;
    authMod.__setUser({ uid: "u1", email: "a@b.com", displayName: "A B" });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    const el = await screen.findByTestId("authstate");
    expect(el).toHaveTextContent("signedIn");
  });
});
