// lib/auth/signIn.ts
import auth from "@react-native-firebase/auth";
import * as Apple from "expo-apple-authentication";
import * as Crypto from "expo-crypto";

function toFriendly(e: unknown) {
  const m = e instanceof Error ? e.message : "Sign-in failed. Please try again.";
  return new Error(m);
}

/**
 * Create a URL-safe nonce without using Buffer (React Native friendly).
 * 16 random bytes -> 32-char hex string.
 */
async function createNonce(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(16);
  let hex = "";
  for (const b of bytes) {
    // b is a number (0-255)
    hex += b.toString(16).padStart(2, "0");
  }
  return hex;
}

export async function signInWithApple() {
  try {
    const rawNonce = await createNonce();
    const hashed = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      rawNonce
    );

    const res = await Apple.signInAsync({
      requestedScopes: [
        Apple.AppleAuthenticationScope.FULL_NAME,
        Apple.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashed,
    });

    if (!res.identityToken) throw new Error("No Apple identity token");

    const cred = auth.AppleAuthProvider.credential(res.identityToken, rawNonce);
    return auth().signInWithCredential(cred);
  } catch (e) {
    throw toFriendly(e);
  }
}

/** Called by GoogleSignInButton with a valid idToken */
export async function completeGoogleSignIn(idToken: string) {
  try {
    const cred = auth.GoogleAuthProvider.credential(idToken);
    return auth().signInWithCredential(cred);
  } catch (e) {
    throw toFriendly(e);
  }
}

export async function appSignOut() {
  await auth().signOut();
}
