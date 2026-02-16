// __tests__/authContext.signedin.test.tsx
import React, { type ComponentType, type ReactNode } from "react";
import { Text } from "react-native";
import { render, screen, waitFor } from "@testing-library/react-native";

// --- Mocks must come BEFORE requiring the AuthContext module ---

// Minimal no-op mock to fence off native App module.
jest.mock("@react-native-firebase/app", () => ({
  __esModule: true,
  default: {},
}));

// Mock Firebase Auth: immediately fires an authenticated user.
jest.mock("@react-native-firebase/auth", () => {
  const auth = () => ({
    onAuthStateChanged: (cb: (user: unknown) => void) => {
      // Call synchronously so the provider transitions during the first effect flush.
      cb({ uid: "u_test" });
      return () => {};
    },
    signOut: jest.fn().mockResolvedValue(undefined),
  });
  return { __esModule: true, default: auth };
});

// Avoid touching Firestore by stubbing ensureUserProvisioned
jest.mock("@/lib/users/provision", () => ({
  __esModule: true,
  ensureUserProvisioned: jest.fn().mockResolvedValue(undefined),
}));

// Avoid pulling in any platform-specific sign-in helpers
jest.mock("@/lib/auth/signIn", () => ({
  __esModule: true,
  signInWithApple: jest.fn(),
  completeGoogleSignIn: jest.fn(),
  appSignOut: jest.fn().mockResolvedValue(undefined),
}));

// --- Require the AuthContext AFTER mocks are set up ---
type AuthModule = typeof import("@/lib/auth/AuthContext");
let AuthProvider: ComponentType<{ children: ReactNode }>; // ← children REQUIRED
let useAuth: AuthModule["useAuth"];

beforeAll(() => {
  const m = require("@/lib/auth/AuthContext") as AuthModule;
  AuthProvider = m.AuthProvider as ComponentType<{ children: ReactNode }>;
  useAuth = m.useAuth;
});

// Small probe component to read the context state
function Probe() {
  const { state } = useAuth();
  return <Text testID="auth-status">{state.status}</Text>;
}

test("AuthContext transitions: loading → signedIn", async () => {
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>
  );

  await waitFor(() => {
    expect(screen.getByTestId("auth-status").props.children).toBe("signedIn");
  });
});
