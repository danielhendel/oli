/**
 * Pure, deterministic Oli Food Graph identifiers (no Firestore / firebase-admin).
 */

import { createHash } from "crypto";
import type { NutritionFoodSearchItemDto } from "@oli/contracts/nutritionFoodSearch";
import { normalizeBrandForGraph, normalizeFoodNameForGraph } from "./foodGraphNormalize";

export function isFoodGraphEnabled(): boolean {
  const v = process.env.NUTRITION_FOOD_GRAPH_DISABLED?.trim().toLowerCase();
  return v !== "1" && v !== "true" && v !== "yes";
}

function hash16(input: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i += 1) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) >>> 0;
  h2 = Math.imul(h2 ^ (h2 >>> 13), 3266489909) >>> 0;
  return (h1.toString(16) + h2.toString(16)).slice(0, 16);
}

export function encodeSourceMapKey(sourceKey: string): string {
  return createHash("sha256").update(sourceKey, "utf8").digest("base64url").slice(0, 86);
}

export function computeOliFoodIdFromItem(item: NutritionFoodSearchItemDto, sourceKey: string): string {
  const digits = (item.barcode ?? "").replace(/\D/g, "");
  if (digits.length >= 8) {
    return `oli:fg:upc:${digits}`;
  }
  const sk = sourceKey.trim();
  if (sk.startsWith("nutritionix:")) {
    return `oli:fg:v1:${hash16(`sk:${sk}`)}`;
  }
  if (sk.startsWith("dev_")) {
    return `oli:fg:dev:${hash16(`sk:${sk}`)}`;
  }
  const n = normalizeFoodNameForGraph(item.name);
  const b = normalizeBrandForGraph(item.brand);
  return `oli:fg:v1:${hash16(`n:${n}|b:${b}|sk:${sk}`)}`;
}
