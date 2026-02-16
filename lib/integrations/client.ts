import { Linking } from "react-native";
import type { ProviderKey } from "./providers";

export async function startConnect(args: { backendBaseUrl: string; provider: ProviderKey; uid: string }) {
  const { backendBaseUrl, provider, uid } = args;
  const url = `${backendBaseUrl}/oauth/${provider}/start?uid=${encodeURIComponent(uid)}`;
  await Linking.openURL(url);
}

export async function disconnectProvider(_provider: ProviderKey): Promise<void> {
  // Client-side disconnect is handled via Firestore doc update in the screen for now.
  return;
}
