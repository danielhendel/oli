// lib/auth/deleteAccount.ts
import auth from "@react-native-firebase/auth";
import Constants from "expo-constants";

type Extra = {
  backendBaseUrl?: string;
};

export async function deleteAccount() {
  const token = await auth().currentUser?.getIdToken(true);
  if (!token) throw new Error("Not signed in.");

  const extra = (Constants.expoConfig?.extra ?? {}) as unknown as Extra;
  const base = extra.backendBaseUrl ?? "";
  const res = await fetch(`${base}/account/delete`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Server rejected delete.");
  await auth().currentUser?.delete();
}
