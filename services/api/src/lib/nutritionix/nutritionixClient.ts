/**
 * Server-side Nutritionix Track API v2 client (Cloud Run only).
 * Secrets must never be logged.
 */

import { NutritionixProviderError, type NutritionixProviderErrorCode } from "./nutritionixErrors";
import type { NutritionixCredentials } from "./nutritionProviderEnv";

const BASE_URL = "https://trackapi.nutritionix.com";
const TIMEOUT_SEARCH_MS = 12_000;
const TIMEOUT_ITEM_MS = 12_000;
const TIMEOUT_NATURAL_MS = 12_000;

function classifyHttpError(status: number): NutritionixProviderErrorCode {
  if (status === 401 || status === 403) return "AUTH";
  if (status === 404) return "NOT_FOUND";
  if (status === 429) return "RATE_LIMIT";
  if (status >= 500) return "UNAVAILABLE";
  return "BAD_RESPONSE";
}

function headers(creds: NutritionixCredentials): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    "x-app-id": creds.appId,
    "x-app-key": creds.appKey,
    "x-remote-user-id": creds.remoteUserId,
  };
}

async function fetchJson(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<{ status: number; json: unknown }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    const text = await res.text();
    let json: unknown = null;
    if (text) {
      try {
        json = JSON.parse(text) as unknown;
      } catch {
        throw new NutritionixProviderError("BAD_RESPONSE", `HTTP ${res.status}: non-JSON body`, res.status);
      }
    }
    return { status: res.status, json };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "network error";
    if (msg.includes("AbortError") || e instanceof Error && e.name === "AbortError") {
      throw new NutritionixProviderError("UNAVAILABLE", "Request timed out");
    }
    throw new NutritionixProviderError("UNAVAILABLE", msg);
  } finally {
    clearTimeout(timer);
  }
}

function throwIfNutritionixHttpError(status: number, json: unknown): void {
  if (status >= 200 && status < 300) return;
  const code = classifyHttpError(status);
  const snippet =
    typeof json === "object" && json !== null && "message" in json && typeof (json as { message?: unknown }).message === "string"
      ? (json as { message: string }).message.slice(0, 120)
      : `HTTP ${status}`;
  throw new NutritionixProviderError(code, snippet, status);
}

export async function nutritionixSearchInstant(
  creds: NutritionixCredentials,
  query: string,
): Promise<unknown> {
  const q = encodeURIComponent(query);
  const url = `${BASE_URL}/v2/search/instant?query=${q}`;
  const { status, json } = await fetchJson(url, { method: "GET", headers: headers(creds) }, TIMEOUT_SEARCH_MS);
  throwIfNutritionixHttpError(status, json);
  return json;
}

export async function nutritionixGetItemByNixId(
  creds: NutritionixCredentials,
  nixItemId: string,
): Promise<unknown> {
  const id = encodeURIComponent(nixItemId);
  const url = `${BASE_URL}/v2/search/item?nix_item_id=${id}`;
  const { status, json } = await fetchJson(url, { method: "GET", headers: headers(creds) }, TIMEOUT_ITEM_MS);
  throwIfNutritionixHttpError(status, json);
  return json;
}

export async function nutritionixGetItemByUpc(creds: NutritionixCredentials, upc: string): Promise<unknown> {
  const u = encodeURIComponent(upc.trim());
  const url = `${BASE_URL}/v2/search/item?upc=${u}`;
  const { status, json } = await fetchJson(url, { method: "GET", headers: headers(creds) }, TIMEOUT_ITEM_MS);
  throwIfNutritionixHttpError(status, json);
  return json;
}

export async function nutritionixNaturalNutrients(
  creds: NutritionixCredentials,
  query: string,
): Promise<unknown> {
  const url = `${BASE_URL}/v2/natural/nutrients`;
  const body = JSON.stringify({ query: query.trim() });
  const { status, json } = await fetchJson(
    url,
    { method: "POST", headers: headers(creds), body },
    TIMEOUT_NATURAL_MS,
  );
  throwIfNutritionixHttpError(status, json);
  return json;
}
