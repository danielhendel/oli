// lib/api/client.ts
import { Platform } from "react-native";
import Constants from "expo-constants";
import auth from "@react-native-firebase/auth";

type Extra = {
  backendBaseUrl?: string;
};

// Minimal fetch init for RN without relying on DOM lib types
type FetchInit = {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
};

function resolveBaseUrl(): string {
  const extra = (Constants?.expoConfig?.extra ?? {}) as Extra;
  let base = extra.backendBaseUrl || "http://localhost:8080";

  // Make localhost work on emulators/simulators
  if (base.includes("localhost")) {
    base = base.replace(
      "localhost",
      Platform.OS === "android" ? "10.0.2.2" : "127.0.0.1"
    );
  }
  return base;
}

export async function apiFetch<T = unknown>(
  path: string,
  init: FetchInit = {}
): Promise<T> {
  const idToken = await auth().currentUser?.getIdToken(true);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers ?? {}),
  };
  if (idToken) headers.Authorization = `Bearer ${idToken}`;

  const res = await fetch(`${resolveBaseUrl()}${path}`, {
    ...init,
    headers,
  });

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // Non-JSON response
    data = null;
  }

  if (!res.ok) {
    // Extract a clean message if the API sent `{ error: string }`
    let message = `HTTP ${res.status}`;
    if (
      data &&
      typeof data === "object" &&
      "error" in data &&
      typeof (data as { error: unknown }).error === "string"
    ) {
      message = (data as { error: string }).error;
    }

    const err = new Error(message);
    (err as { status?: number }).status = res.status;
    (err as { body?: unknown }).body = data;
    throw err;
  }

  return data as T;
}
