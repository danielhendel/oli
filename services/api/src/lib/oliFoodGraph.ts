/**
 * Oli Food Graph v1 — server-only catalog (Firestore `system/foodGraph/*`).
 * Stores normalized nutrition rows; no vendor payloads; Admin SDK bypasses client rules.
 */

import type { NutritionFoodSearchItemDto } from "@oli/contracts/nutritionFoodSearch";
import type { NutritionMetaDto } from "@oli/contracts/nutritionMeta";
import {
  foodGraphSourceSchema,
  foodServingSchema,
  nutritionBasisSchema,
  nutritionPer100gSchema,
  processingClassSchema,
} from "@oli/contracts/nutritionProduct";
import { z } from "zod";
import { db, FieldValue, foodGraphNodesCollection, foodGraphSourceMapCollection } from "../db";
import { computeOliFoodIdFromItem, encodeSourceMapKey, isFoodGraphEnabled } from "./foodGraphIds";
import { logger } from "./logger";
import { normalizeBrandForGraph, normalizeFoodNameForGraph } from "./foodGraphNormalize";
import { buildFoodSearchTokens } from "./foodSearch/searchTokens";

export { computeOliFoodIdFromItem, encodeSourceMapKey, isFoodGraphEnabled } from "./foodGraphIds";

export type FoodNodeSource = "nutritionix" | "dev_catalog" | "open" | "usda" | "user" | "curated";

const servingsSchema = z.array(foodServingSchema);

export type FoodGraphMacros = {
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG?: number;
  sugarG?: number;
  sodiumMg?: number;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function macrosFromDto(item: NutritionFoodSearchItemDto): FoodGraphMacros {
  const m: FoodGraphMacros = {
    caloriesKcal: round2(Math.max(0, item.caloriesKcal)),
    proteinG: round2(Math.max(0, item.proteinG)),
    carbsG: round2(Math.max(0, item.carbsG)),
    fatG: round2(Math.max(0, item.fatG)),
  };
  if (item.fiberG !== undefined) m.fiberG = round2(Math.max(0, item.fiberG));
  if (item.sugarG !== undefined) m.sugarG = round2(Math.max(0, item.sugarG));
  if (item.sodiumMg !== undefined) m.sodiumMg = round2(Math.max(0, item.sodiumMg));
  return m;
}

export function foodGraphDocToSearchDto(oliFoodId: string, data: Record<string, unknown>): NutritionFoodSearchItemDto | null {
  const name = typeof data.name === "string" && data.name.trim().length > 0 ? data.name.trim() : null;
  if (!name) return null;
  const macros = data.macros as FoodGraphMacros | undefined;
  if (!macros || typeof macros !== "object") return null;
  const servingLabel =
    typeof data.servingLabel === "string" && data.servingLabel.trim().length > 0 ? data.servingLabel.trim() : "1 serving";
  const brandName = typeof data.brandName === "string" && data.brandName.trim().length > 0 ? data.brandName.trim() : undefined;
  const barcode = typeof data.barcode === "string" && data.barcode.trim().length > 0 ? data.barcode.trim().slice(0, 32) : undefined;

  const productType =
    data.productType === "food" || data.productType === "supplement" ? data.productType : undefined;
  const storeId = typeof data.storeId === "string" && data.storeId.trim().length > 0 ? data.storeId.trim() : undefined;

  // Food Graph Foundation (Phase A/B) — additive carries, all optional.
  const per100g = nutritionPer100gSchema.safeParse(data.per100g);
  const servings = servingsSchema.safeParse(data.servings);
  const source = foodGraphSourceSchema.safeParse(data.source);
  const basis = nutritionBasisSchema.safeParse(data.basis);
  const processingClass = processingClassSchema.safeParse(data.processingClass);
  const confidence =
    typeof data.confidence === "number" && Number.isFinite(data.confidence)
      ? Math.min(1, Math.max(0, data.confidence))
      : undefined;
  const attributionRequired = typeof data.attributionRequired === "boolean" ? data.attributionRequired : undefined;

  const item: NutritionFoodSearchItemDto = {
    id: oliFoodId,
    name,
    servingLabel,
    caloriesKcal: round2(Math.max(0, Number(macros.caloriesKcal) || 0)),
    proteinG: round2(Math.max(0, Number(macros.proteinG) || 0)),
    carbsG: round2(Math.max(0, Number(macros.carbsG) || 0)),
    fatG: round2(Math.max(0, Number(macros.fatG) || 0)),
    ...(brandName !== undefined ? { brand: brandName } : {}),
    ...(macros.fiberG !== undefined ? { fiberG: round2(Math.max(0, macros.fiberG)) } : {}),
    ...(macros.sugarG !== undefined ? { sugarG: round2(Math.max(0, macros.sugarG)) } : {}),
    ...(macros.sodiumMg !== undefined ? { sodiumMg: round2(Math.max(0, macros.sodiumMg)) } : {}),
    ...(barcode !== undefined ? { barcode } : {}),
    ...(productType !== undefined ? { productType } : {}),
    ...(storeId !== undefined ? { storeId } : {}),
    ...(per100g.success ? { per100g: per100g.data } : {}),
    ...(servings.success && servings.data.length > 0 ? { servings: servings.data } : {}),
    ...(source.success ? { source: source.data } : {}),
    ...(basis.success ? { basis: basis.data } : {}),
    ...(confidence !== undefined ? { confidence } : {}),
    ...(attributionRequired !== undefined ? { attributionRequired } : {}),
    ...(processingClass.success ? { processingClass: processingClass.data } : {}),
  };
  return item;
}

export async function getFoodGraphDtoByOliId(oliFoodId: string): Promise<NutritionFoodSearchItemDto | null> {
  const id = oliFoodId.trim();
  if (!id.startsWith("oli:fg:")) return null;
  const snap = await foodGraphNodesCollection().doc(id).get();
  if (!snap.exists) return null;
  return foodGraphDocToSearchDto(id, snap.data() ?? {});
}

export async function getFoodGraphDtoBySourceKey(sourceKey: string): Promise<NutritionFoodSearchItemDto | null> {
  const sk = sourceKey.trim();
  if (!sk) return null;
  const mapSnap = await foodGraphSourceMapCollection().doc(encodeSourceMapKey(sk)).get();
  if (!mapSnap.exists) return null;
  const data = mapSnap.data();
  const oliFoodId = typeof data?.oliFoodId === "string" ? data.oliFoodId.trim() : "";
  if (!oliFoodId) return null;
  return getFoodGraphDtoByOliId(oliFoodId);
}

export async function getFoodGraphDtoByBarcodeDigits(digits: string): Promise<NutritionFoodSearchItemDto | null> {
  const d = digits.replace(/\D/g, "");
  if (d.length < 8) return null;
  return getFoodGraphDtoByOliId(`oli:fg:upc:${d}`);
}

export async function queryFoodGraphByNormalizedPrefix(
  prefix: string,
  limit: number,
): Promise<NutritionFoodSearchItemDto[]> {
  const p = prefix.trim().toLowerCase();
  if (p.length === 0) return [];
  const col = foodGraphNodesCollection();
  const end = `${p}\uf8ff`;
  const snap = await col.where("normalizedName", ">=", p).where("normalizedName", "<=", end).limit(limit).get();
  const out: NutritionFoodSearchItemDto[] = [];
  for (const doc of snap.docs) {
    const dto = foodGraphDocToSearchDto(doc.id, doc.data() as Record<string, unknown>);
    if (dto) out.push(dto);
  }
  return out;
}

/**
 * Token recall: find nodes whose `searchTokens` array contains any of the
 * query tokens (Firestore `array-contains-any`, max 10 values). Exact/token
 * recall for persisted nodes; fuzzy recall for curated P0 foods comes from the
 * in-memory seed search layer.
 */
export async function queryFoodGraphByTokens(tokens: string[], limit: number): Promise<NutritionFoodSearchItemDto[]> {
  const unique = [...new Set(tokens.map((t) => t.trim()).filter((t) => t.length > 0))].slice(0, 10);
  if (unique.length === 0) return [];
  const col = foodGraphNodesCollection();
  const snap = await col.where("searchTokens", "array-contains-any", unique).limit(limit).get();
  const out: NutritionFoodSearchItemDto[] = [];
  for (const doc of snap.docs) {
    const dto = foodGraphDocToSearchDto(doc.id, doc.data() as Record<string, unknown>);
    if (dto) out.push(dto);
  }
  return out;
}

function mergeUniqueSourceKeys(existing: string[] | undefined, next: string): string[] {
  const set = new Set<string>(existing ?? []);
  set.add(next);
  return [...set].sort();
}

function mergeAliases(existing: string[] | undefined, normalizedName: string): string[] {
  const set = new Set<string>(existing ?? []);
  if (normalizedName.length > 0) set.add(normalizedName);
  return [...set].sort();
}

/**
 * Idempotent upsert: writes node + source map. Returns DTO with canonical `oli:fg:` id.
 * Does not persist raw vendor payloads (license-safe).
 */
export async function upsertFoodGraphFromSearchItem(
  item: NutritionFoodSearchItemDto,
  source: FoodNodeSource,
  sourceKey: string,
): Promise<NutritionFoodSearchItemDto> {
  if (!isFoodGraphEnabled()) {
    return item;
  }
  const sk = sourceKey.trim();
  if (!sk) {
    return item;
  }
  const oliFoodId = computeOliFoodIdFromItem(item, sk);
  const normalizedName = normalizeFoodNameForGraph(item.name);
  const normalizedBrand = normalizeBrandForGraph(item.brand);
  const brandName = item.brand?.trim() ? item.brand.trim() : undefined;
  const barcode = item.barcode?.trim() ? item.barcode.trim().replace(/\D/g, "").slice(0, 32) : undefined;
  const macros = macrosFromDto(item);
  const searchTokens = buildFoodSearchTokens({ name: item.name, brand: item.brand });

  const nodeRef = foodGraphNodesCollection().doc(oliFoodId);
  const mapRef = foodGraphSourceMapCollection().doc(encodeSourceMapKey(sk));

  try {
    await db.runTransaction(async (tx) => {
      const existing = await tx.get(nodeRef);
      const prev = existing.exists ? existing.data() : undefined;
      const sourceKeys = mergeUniqueSourceKeys(prev?.sourceKeys as string[] | undefined, sk);
      const aliases = mergeAliases(prev?.aliases as string[] | undefined, normalizedName);
      const createdAt = prev?.createdAt ?? FieldValue.serverTimestamp();
      const doc: Record<string, unknown> = {
        oliFoodId,
        name: item.name.trim() || prev?.name || "Food",
        normalizedName,
        source,
        macros,
        servingLabel: item.servingLabel.trim() || prev?.servingLabel || "1 serving",
        aliases,
        sourceKeys,
        searchTokens,
        updatedAt: FieldValue.serverTimestamp(),
        createdAt,
      };
      // Food Graph Foundation carries (additive; preserve prior when absent).
      if (item.per100g !== undefined) doc.per100g = item.per100g;
      else if (prev && typeof prev["per100g"] === "object" && prev["per100g"] !== null) doc.per100g = prev["per100g"];
      if (item.servings !== undefined && item.servings.length > 0) doc.servings = item.servings;
      else if (prev && Array.isArray(prev["servings"])) doc.servings = prev["servings"];
      if (item.basis !== undefined) doc.basis = item.basis;
      else if (prev && (prev["basis"] === "mass" || prev["basis"] === "volume")) doc.basis = prev["basis"];
      if (item.confidence !== undefined) doc.confidence = item.confidence;
      else if (prev && typeof prev["confidence"] === "number") doc.confidence = prev["confidence"];
      if (item.attributionRequired !== undefined) doc.attributionRequired = item.attributionRequired;
      else if (prev && typeof prev["attributionRequired"] === "boolean") doc.attributionRequired = prev["attributionRequired"];
      if (item.processingClass !== undefined) doc.processingClass = item.processingClass;
      else if (prev && typeof prev["processingClass"] === "string") doc.processingClass = prev["processingClass"];
      if (brandName !== undefined) {
        doc.brandName = brandName;
        doc.normalizedBrand = normalizedBrand;
      } else if (prev && typeof prev["brandName"] === "string") {
        doc.brandName = prev["brandName"];
        doc.normalizedBrand = typeof prev["normalizedBrand"] === "string" ? prev["normalizedBrand"] : "";
      }
      if (barcode !== undefined && barcode.length >= 8) {
        doc.barcode = barcode;
      } else if (prev && typeof prev["barcode"] === "string") {
        doc.barcode = prev["barcode"];
      }
      if (item.productType === "food" || item.productType === "supplement") {
        doc.productType = item.productType;
      } else if (prev && (prev["productType"] === "food" || prev["productType"] === "supplement")) {
        doc.productType = prev["productType"];
      }
      if (item.storeId !== undefined && item.storeId.trim().length > 0) {
        doc.storeId = item.storeId.trim();
      } else if (prev && typeof prev["storeId"] === "string") {
        doc.storeId = prev["storeId"];
      }
      tx.set(nodeRef, doc, { merge: true });
      tx.set(
        mapRef,
        {
          oliFoodId,
          sourceKey: sk,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.warn({ msg: "food_graph_upsert_failed", oliFoodId, sourceKey: sk, err: msg.slice(0, 200) });
    return item;
  }

  return {
    ...item,
    id: oliFoodId,
    ...(brandName !== undefined ? { brand: brandName } : item.brand !== undefined ? { brand: item.brand } : {}),
    ...(barcode !== undefined && barcode.length >= 8 ? { barcode } : {}),
  };
}

export async function remapSearchItemsThroughFoodGraph(
  items: NutritionFoodSearchItemDto[],
  source: FoodNodeSource,
  sourceKeyForItem: (item: NutritionFoodSearchItemDto) => string,
): Promise<NutritionFoodSearchItemDto[]> {
  if (!isFoodGraphEnabled() || items.length === 0) {
    return items;
  }
  const out = await Promise.all(
    items.map(async (item) => upsertFoodGraphFromSearchItem(item, source, sourceKeyForItem(item))),
  );
  return out;
}

/** Resolve nutrition-meta entries that substring-match the normalized query into DTOs (graph first). */
export async function resolveUserFoodMemoryMatches(
  meta: NutritionMetaDto | null,
  normalizedQuery: string,
  maxItems: number,
): Promise<NutritionFoodSearchItemDto[]> {
  if (!meta || maxItems <= 0) return [];
  const q = normalizedQuery.trim();
  if (q.length === 0) return [];

  type Ref = { id: string; oliFoodId?: string; name: string; brand?: string; foodHash: string };
  const candidates: Ref[] = [
    ...meta.recentFoods.map((r) => ({
      id: r.id,
      name: r.name,
      foodHash: r.foodHash,
      ...(r.brand !== undefined ? { brand: r.brand } : {}),
      ...(r.oliFoodId !== undefined ? { oliFoodId: r.oliFoodId } : {}),
    })),
    ...meta.favoriteFoods.map((r) => ({
      id: r.id,
      name: r.name,
      foodHash: r.foodHash,
      ...(r.brand !== undefined ? { brand: r.brand } : {}),
      ...(r.oliFoodId !== undefined ? { oliFoodId: r.oliFoodId } : {}),
    })),
  ];

  const seen = new Set<string>();
  const out: NutritionFoodSearchItemDto[] = [];

  for (const c of candidates) {
    if (out.length >= maxItems) break;
    const hay = normalizeFoodNameForGraph(`${c.name} ${c.brand ?? ""}`);
    if (!hay.includes(q)) continue;
    const dedupeKey = c.oliFoodId ?? c.foodHash ?? c.id;
    if (seen.has(dedupeKey)) continue;

    let dto: NutritionFoodSearchItemDto | null = null;
    if (c.oliFoodId?.startsWith("oli:fg:")) {
      dto = await getFoodGraphDtoByOliId(c.oliFoodId);
    }
    if (!dto) {
      dto = await getFoodGraphDtoBySourceKey(c.id);
    }
    if (dto) {
      seen.add(dedupeKey);
      out.push(dto);
    }
  }

  return out;
}

/** Test hook: clear in-memory state if we add any (none today). */
export function clearOliFoodGraphTestState(): void {
  /* reserved */
}
