/**
 * Open Food Facts product client (Phase B Task 4).
 *
 * Barcode-first lookup against the public OFF API. Returns the parsed product
 * object (a thin shape) on hit, `null` on a clean "product not found", and
 * throws {@link OpenFoodFactsError} on network/timeout/upstream errors so the
 * caller can degrade gracefully. Mirrors the Nutritionix `fetchJson` pattern
 * (AbortController timeout, typed error). Raw payloads are never persisted.
 */

import type { OpenFoodFactsProduct } from "./openFoodFactsAdapter";

const OFF_BASE_URL = "https://world.openfoodfacts.org/api/v2/product";
const OFF_FIELDS =
  "code,product_name,product_name_en,brands,nutriments,serving_quantity,serving_size,nova_group,rev";
const TIMEOUT_MS = 8_000;
// OFF policy asks API consumers to identify themselves via User-Agent.
const USER_AGENT = "Oli/1.0 (nutrition; +https://oli.health)";

export type OpenFoodFactsErrorCode = "TIMEOUT" | "NETWORK" | "BAD_RESPONSE" | "UNAVAILABLE";

export class OpenFoodFactsError extends Error {
  readonly code: OpenFoodFactsErrorCode;
  readonly httpStatus?: number;

  constructor(code: OpenFoodFactsErrorCode, message: string, httpStatus?: number) {
    super(message);
    this.name = "OpenFoodFactsError";
    this.code = code;
    if (httpStatus !== undefined) this.httpStatus = httpStatus;
  }
}

/** Feature flag — OFF lookups can be disabled via env for compliance/incident response. */
export function isOpenFoodFactsEnabled(): boolean {
  const v = process.env.NUTRITION_OFF_DISABLED?.trim().toLowerCase();
  return v !== "1" && v !== "true" && v !== "yes";
}

function extractProduct(json: unknown): OpenFoodFactsProduct | null {
  if (typeof json !== "object" || json === null) return null;
  const obj = json as { status?: unknown; product?: unknown };
  if (obj.status === 0) return null;
  if (typeof obj.product !== "object" || obj.product === null) return null;
  return obj.product as OpenFoodFactsProduct;
}

/**
 * Fetch a product by barcode. Returns `null` for not-found (HTTP 404 or
 * `status:0`); throws {@link OpenFoodFactsError} on transport/upstream errors.
 */
export async function fetchOpenFoodFactsProduct(barcode: string): Promise<OpenFoodFactsProduct | null> {
  const digits = barcode.replace(/\D/g, "");
  if (digits.length < 8) return null;

  const url = `${OFF_BASE_URL}/${encodeURIComponent(digits)}.json?fields=${OFF_FIELDS}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json", "User-Agent": USER_AGENT },
      signal: controller.signal,
    });
    if (res.status === 404) return null;
    if (res.status < 200 || res.status >= 300) {
      throw new OpenFoodFactsError("UNAVAILABLE", `OFF HTTP ${res.status}`, res.status);
    }
    const text = await res.text();
    if (!text) return null;
    let json: unknown;
    try {
      json = JSON.parse(text) as unknown;
    } catch {
      throw new OpenFoodFactsError("BAD_RESPONSE", "OFF returned non-JSON body", res.status);
    }
    return extractProduct(json);
  } catch (e: unknown) {
    if (e instanceof OpenFoodFactsError) throw e;
    if (e instanceof Error && e.name === "AbortError") {
      throw new OpenFoodFactsError("TIMEOUT", "OFF request timed out");
    }
    const msg = e instanceof Error ? e.message : "network error";
    throw new OpenFoodFactsError("NETWORK", msg);
  } finally {
    clearTimeout(timer);
  }
}
