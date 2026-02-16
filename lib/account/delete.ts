// lib/account/delete.ts
import { getAuthInstance } from "../firebaseConfig";

export async function localDeleteFirebaseUser(): Promise<void> {
  const auth = getAuthInstance();
  const u = auth.currentUser;
  if (!u) throw new Error("Not signed in");
  await u.delete(); // requires recent login; app should re-auth or use backend token route if needed
}
