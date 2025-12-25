// lib/api/functions.ts
import type { ApiResult, JsonValue } from "./http";

const parseJsonSafely = (text: string): JsonValue | undefined => {
  if (!text) return undefined;
  try {
    return JSON.parse(text) as JsonValue;
  } catch {
    return undefined;
  }
};

const getFunctionsBaseUrl = (): string => {
  const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId || projectId.trim().length === 0) {
    throw new Error("Missing EXPO_PUBLIC_FIREBASE_PROJECT_ID.");
  }
  return `https://us-central1-${projectId.trim()}.cloudfunctions.net`;
};

const joinUrl = (base: string, path: string): string => {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
};

export const functionsPostJson = async (
  functionName: string,
  body: unknown,
  idToken: string
): Promise<ApiResult> => {
  const base = getFunctionsBaseUrl();
  const url = joinUrl(base, functionName);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    const json = parseJsonSafely(text);

    if (!res.ok) {
      return json
        ? { ok: false as const, status: res.status, error: `POST ${functionName} failed (${res.status})`, json }
        : { ok: false as const, status: res.status, error: `POST ${functionName} failed (${res.status})` };
    }

    return { ok: true as const, status: res.status, json: json ?? ({} as JsonValue) };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Network error";
    return { ok: false as const, status: 0, error: msg };
  }
};

// Back-compat export required by lib/debug/recompute.ts
export const callAdminFunction = async (
  functionName: string,
  body: unknown,
  idToken: string
): Promise<ApiResult> => {
  return functionsPostJson(functionName, body, idToken);
};
