// Pure Apple UI bridge (no Firebase imports).
// Obtains an Apple identityToken via expo-apple-authentication.

import * as AppleAuthentication from "expo-apple-authentication";

export type AppleIdTokenResult = {
  idToken: string;
  email: string | null;
  user: string; // Apple user identifier for your Team
};

export async function getAppleIdToken(): Promise<AppleIdTokenResult> {
  const available = await AppleAuthentication.isAvailableAsync();
  if (!available) {
    throw new Error("Apple Sign-In not available on this device.");
  }

  const cred = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    // Note: Expo's API exposes `state`; `nonce` support is platform-dependent.
    // For initial integration, we rely on idToken; we can add nonce hardening later.
  });

  if (!cred.identityToken) {
    // Common when testing in mismatched environments (Expo Go / wrong bundle id)
    throw new Error("No identityToken returned by Apple.");
  }

  return {
    idToken: cred.identityToken,
    email: cred.email ?? null,
    user: cred.user,
  };
}
