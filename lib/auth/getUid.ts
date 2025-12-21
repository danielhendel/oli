// lib/auth/getUid.ts

import { getFirebaseAuth } from "../firebaseConfig";

export const getUid = (): string => {
  const auth = getFirebaseAuth();
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Not signed in.");
  return uid;
};
