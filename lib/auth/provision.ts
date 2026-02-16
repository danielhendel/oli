// lib/auth/provision.ts
/**
 * Provision a brand-new user with a default Profile (local stub for now).
 * Works with the same profile helpers the Dash uses, so types line up.
 */
import {
  makeDefaultProfile,
  saveProfile,
  type Profile,
} from "../profile/profile";

/**
 * Create a starter profile for a new user.
 * @param uid Firebase UID (reserved for future remote profile use)
 * @param displayName Optional initial display name
 */
export async function provisionUser(uid: string, displayName?: string) {
  const base = makeDefaultProfile();

  // Ensure a concrete string to satisfy exactOptionalPropertyTypes.
  const effectiveName: string =
    (typeof displayName === "string" && displayName.length > 0
      ? displayName
      : (base as Partial<Profile>).displayName ?? "") as string;

  const profile: Profile = {
    ...base,
    displayName: effectiveName, // guaranteed string
  };

  await saveProfile(profile);
}
