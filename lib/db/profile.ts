// lib/db/profile.ts
import { getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { profileDoc } from "./paths";
import { profileConverter } from "./converters";
import type { UserProfile } from "../types/domain";

const mapErr = (e: unknown) =>
  e instanceof Error ? new Error(`profile: ${e.message}`) : new Error("profile: unknown error");

export async function getUserProfile(uid: string): Promise<(UserProfile & { id: string }) | null> {
  try {
    const snap = await getDoc(profileDoc(uid).withConverter(profileConverter));
    return snap.exists() ? (snap.data() as UserProfile & { id: string }) : null;
  } catch (e) {
    throw mapErr(e);
  }
}

/**
 * IMPORTANT: Do NOT force the write object to Partial<UserProfile>,
 * because FieldValue (serverTimestamp) isn't assignable to Timestamp.
 */
export async function saveUserProfile(uid: string, patch: Partial<UserProfile>): Promise<void> {
  try {
    await setDoc(
      profileDoc(uid), // no converter on write so FieldValue is allowed
      {
        ...patch,
        uid,
        updatedAt: serverTimestamp(),
        ...(patch?.createdAt ? {} : { createdAt: serverTimestamp() }),
      } as Record<string, unknown>,
      { merge: true }
    );
  } catch (e) {
    throw mapErr(e);
  }
}
