// lib/auth/getIdToken.ts

import { getFirebaseAuth } from "../firebaseConfig";

/**
 * Centralized ID token access.
 * Uses the app's configured Firebase Auth instance.
 */
export const getIdToken = async (): Promise<string> => {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Not signed in");
  }

  return user.getIdToken();
};
