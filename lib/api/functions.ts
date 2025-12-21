// lib/api/functions.ts

import type { ApiResult, JsonValue } from "./http";

const normalizeProjectId = (projectId: string): string => projectId.trim();

/**
 * Build HTTPS URL for a Firebase Functions v2 onRequest function.
 *
 * Example:
 * https://us-central1-<projectId>.cloudfunctions.net/<functionExportName>
 */
const getFunctionsBaseUrl = (): string => {
  const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error("Missing EXPO_PUBLIC_FIREBASE_PROJECT_ID env var.");
  }
  const pid = normalizeProjectId(projectId);
  return `https://us-central1-${pid}.cloudfunctions.net`;
};

const parseJsonSafely = (text: string): JsonValue | undefined => {
  if (!text) return undefined;
  try {
    return JSON.parse(text) as JsonValue;
  } catch {
    return undefined;
  }
};

export const callAdminFunction = async (
  functionName: string,
  body: unknown,
  idToken: string,
): Promise<ApiResult> => {
  const base = getFunctionsBaseUrl();
  const url = `${base}/${functionName}`;

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
        ? ({ ok: false as const, status: res.status, error: `POST ${functionName} failed (${res.status})`, json })
        : ({ ok: false as const, status: res.status, error: `POST ${functionName} failed (${res.status})` });
    }

    return { ok: true as const, status: res.status, json: json ?? ({} as JsonValue) };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Network error";
    return { ok: false as const, status: 0, error: msg };
  }
};
