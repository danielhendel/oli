/**
 * Native Sign in with Apple → Firebase credential exchange with correct nonce handling.
 * Hardened for: Expo Go/unavailable module, canceled sheet, missing identityToken.
 */
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import { OAuthProvider, signInWithCredential, getAuth } from "firebase/auth";
import { logEvent } from "../../analytics/telemetry";
import { generateRawNonce } from "./apple.utils";

/** SHA-256(hex) helper */
async function sha256Hex(input: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, input);
}

/** Is the native Apple module available (dev client / native build only)? */
async function assertAppleAvailable() {
  const available =
    typeof AppleAuthentication.isAvailableAsync === "function" &&
    (await AppleAuthentication.isAvailableAsync());

  if (!available) {
    const err = new Error(
      "Apple Sign-In is unavailable in this build. Use an EAS dev client or native build (not Expo Go)."
    );
    (err as any).code = "apple/unavailable";
    throw err;
  }
}

export async function signInWithApple(): Promise<void> {
  // 0) Fast fail if we’re in Expo Go or missing entitlement
  await assertAppleAvailable();

  const provider = new OAuthProvider("apple.com");

  // 1) Per-attempt nonce
  const rawNonce = await generateRawNonce(); // e.g., 32 random bytes → hex
  const hashedNonce = await sha256Hex(rawNonce);

  try {
    // 2) Native Apple sheet with *hashed* nonce
    const response = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });

    // 3) Validate token presence
    const { identityToken } = response ?? {};
    if (!identityToken) {
      const err = new Error(
        "Apple returned no identityToken. Make sure the device is signed into iCloud and the app has the Sign in with Apple entitlement."
      );
      (err as any).code = "apple/missing-identity-token";
      throw err;
    }

    // 4) Exchange with Firebase using the *raw* nonce
    const credential = provider.credential({ idToken: identityToken, rawNonce });
    const auth = getAuth();
    await signInWithCredential(auth, credential);

    logEvent("sign_in", { provider: "apple", status: "success" });
  } catch (error: any) {
    // Normalize common Apple/Expo error shapes
    const message = String(error?.message ?? "Unknown error");
    const code =
      error?.code ??
      (message.includes("AuthorizationError error 1001") ? "apple/canceled" : "unknown");

    logEvent("sign_in", { provider: "apple", status: "error", code, message });
    // Re-throw with a friendly message for UI
    const friendly =
      code === "apple/unavailable"
        ? error
        : code === "apple/canceled"
        ? new Error("You canceled Apple Sign-In.")
        : new Error("Apple Sign-In failed. Please try again.");
    (friendly as any).code = code;
    throw friendly;
  }
}
