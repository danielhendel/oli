/**
 * Nutrition food read: Oli Food Graph (primary when enabled) + user memory + TTL cache + dev / Nutritionix.
 */

import type { NutritionFoodSearchItemDto } from "@oli/contracts/nutritionFoodSearch";
import { defaultNutritionMetaDto, nutritionMetaDtoSchema } from "@oli/contracts/nutritionMeta";
import {
  getDevFoodByBarcode,
  getDevFoodById,
  searchDevFoodCatalog,
} from "../nutritionDevFoodCatalog";
import { logger } from "../logger";
import { userNutritionMetaStateDoc } from "../../db";
import { normalizeFoodNameForGraph } from "../foodGraphNormalize";
import { isFoodGraphEnabled } from "../foodGraphIds";
import {
  getFoodGraphDtoByBarcodeDigits,
  getFoodGraphDtoByOliId,
  getFoodGraphDtoBySourceKey,
  queryFoodGraphByNormalizedPrefix,
  remapSearchItemsThroughFoodGraph,
  resolveUserFoodMemoryMatches,
  upsertFoodGraphFromSearchItem,
  type FoodNodeSource,
} from "../oliFoodGraph";
import { nutritionixGetItemByNixId, nutritionixGetItemByUpc, nutritionixNaturalNutrients, nutritionixSearchInstant } from "./nutritionixClient";
import { NutritionixProviderError } from "./nutritionixErrors";
import {
  firstFoodFromNaturalNutrientsResponse,
  firstFoodFromSearchItemResponse,
  mapInstantSearchBody,
  mapNutritionixFoodDocToItem,
  OLI_NUTRITIONIX_BRANDED_PREFIX,
  OLI_NUTRITIONIX_COMMON_PREFIX,
  parseOliNutritionixFoodId,
} from "./mapNutritionixFood";
import { normalizeSearchCacheKey, TtlCache } from "./nutritionFoodCache";
import { getNutritionFoodProviderMode, getNutritionixCredentials } from "./nutritionProviderEnv";

const SEARCH_TTL_MS = 15 * 60 * 1000;
const DETAIL_TTL_MS = 24 * 60 * 60 * 1000;

const searchResultCache = new TtlCache<{
  provider: "dev_catalog" | "nutritionix" | "oli_food_graph";
  items: NutritionFoodSearchItemDto[];
}>();
const detailItemCache = new TtlCache<NutritionFoodSearchItemDto>();
/** Common tag_id → food_name (short TTL; aligns with search cache). */
const commonTagNameCache = new TtlCache<string>();

export type NutritionSearchResolved = {
  provider: "dev_catalog" | "nutritionix" | "oli_food_graph";
  items: NutritionFoodSearchItemDto[];
};

export type NutritionSearchFailure =
  | { ok: false; code: "NUTRITIONIX_NOT_CONFIGURED" }
  | { ok: false; code: "NUTRITIONIX_UPSTREAM" };

export type NutritionFoodReadContext = {
  uid: string;
};

export function clearNutritionFoodReadCachesForTests(): void {
  searchResultCache.clear();
  detailItemCache.clear();
  commonTagNameCache.clear();
}

/** DTO `provider` field from stable id prefixes. */
export function nutritionReadProviderForItem(item: { id: string }): "dev_catalog" | "nutritionix" | "oli_food_graph" {
  if (item.id.startsWith("oli:fg:")) return "oli_food_graph";
  if (item.id.startsWith("nutritionix:")) return "nutritionix";
  return "dev_catalog";
}

function deriveSearchResponseProvider(items: NutritionFoodSearchItemDto[]): "dev_catalog" | "nutritionix" | "oli_food_graph" {
  if (items.length === 0) return "dev_catalog";
  if (items.every((i) => i.id.startsWith("oli:fg:"))) return "oli_food_graph";
  if (items.some((i) => i.id.startsWith("nutritionix:"))) return "nutritionix";
  return "dev_catalog";
}

function dedupeSearchRows(lists: NutritionFoodSearchItemDto[][], maxItems: number): NutritionFoodSearchItemDto[] {
  const seen = new Set<string>();
  const out: NutritionFoodSearchItemDto[] = [];
  for (const list of lists) {
    for (const item of list) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      out.push(item);
      if (out.length >= maxItems) return out;
    }
  }
  return out;
}

function populateCommonTagNamesFromItems(items: NutritionFoodSearchItemDto[]): void {
  for (const item of items) {
    const p = parseOliNutritionixFoodId(item.id);
    if (p?.kind === "common") {
      commonTagNameCache.set(`tag:${p.tagId}`, item.name, SEARCH_TTL_MS);
    }
  }
}

async function loadNutritionMeta(uid: string) {
  const snap = await userNutritionMetaStateDoc(uid).get();
  if (!snap.exists) return defaultNutritionMetaDto();
  const parsed = nutritionMetaDtoSchema.safeParse(snap.data());
  if (!parsed.success) {
    logger.warn({ msg: "nutrition_meta_parse_failed_food_read", uid, err: parsed.error.flatten() });
    return defaultNutritionMetaDto();
  }
  return parsed.data;
}

/**
 * Provider-only search (no graph, no merged search cache). Used as the bottom layer when Food Graph is enabled.
 */
async function internalProviderSearch(query: string): Promise<NutritionSearchResolved | NutritionSearchFailure> {
  const mode = getNutritionFoodProviderMode();
  const q = query.trim();

  if (mode === "dev") {
    return { provider: "dev_catalog", items: searchDevFoodCatalog(q) };
  }

  if (q.length === 0) {
    if (mode === "nutritionix") {
      const creds = getNutritionixCredentials();
      if (!creds) {
        logger.warn({ msg: "nutritionix_credentials_missing", context: "food_search_empty_query" });
        return { ok: false, code: "NUTRITIONIX_NOT_CONFIGURED" };
      }
      return { provider: "nutritionix", items: [] };
    }
    return { provider: "dev_catalog", items: searchDevFoodCatalog("") };
  }

  const creds = getNutritionixCredentials();

  if (mode === "nutritionix") {
    if (!creds) {
      logger.warn({ msg: "nutritionix_credentials_missing", context: "food_search" });
      return { ok: false, code: "NUTRITIONIX_NOT_CONFIGURED" };
    }
    try {
      const raw = await nutritionixSearchInstant(creds, q);
      const items = mapInstantSearchBody(raw, 40);
      populateCommonTagNamesFromItems(items);
      return { provider: "nutritionix", items };
    } catch (e) {
      if (e instanceof NutritionixProviderError && e.code === "NOT_FOUND") {
        return { provider: "nutritionix", items: [] };
      }
      if (e instanceof NutritionixProviderError) {
        logger.warn({
          msg: "nutritionix_search_upstream_failure",
          code: e.code,
          httpStatus: e.httpStatus,
        });
        return { ok: false, code: "NUTRITIONIX_UPSTREAM" };
      }
      throw e;
    }
  }

  if (!creds) {
    logger.warn({ msg: "nutritionix_credentials_missing_fallback_dev", context: "food_search" });
    return { provider: "dev_catalog", items: searchDevFoodCatalog(q) };
  }

  try {
    const raw = await nutritionixSearchInstant(creds, q);
    const items = mapInstantSearchBody(raw, 40);
    populateCommonTagNamesFromItems(items);
    return { provider: "nutritionix", items };
  } catch (e) {
    if (e instanceof NutritionixProviderError) {
      logger.warn({
        msg: "nutritionix_search_fallback_dev",
        code: e.code,
        httpStatus: e.httpStatus,
      });
      return { provider: "dev_catalog", items: searchDevFoodCatalog(q) };
    }
    throw e;
  }
}

async function resolveNutritionFoodSearchLegacy(query: string): Promise<NutritionSearchResolved | NutritionSearchFailure> {
  const q = query.trim();
  const cacheKey = `search:${normalizeSearchCacheKey(q)}`;
  const hit = searchResultCache.get(cacheKey);
  if (hit) return hit;

  const resolved = await internalProviderSearch(query);
  if ("ok" in resolved) {
    return resolved;
  }
  searchResultCache.set(cacheKey, resolved, SEARCH_TTL_MS);
  return resolved;
}

async function resolveNutritionFoodSearchWithGraph(
  query: string,
  ctx: NutritionFoodReadContext,
): Promise<NutritionSearchResolved | NutritionSearchFailure> {
  const q = query.trim();
  const cacheKey = `search:${ctx.uid}:${normalizeSearchCacheKey(q)}`;
  const hit = searchResultCache.get(cacheKey);
  if (hit) return hit;

  const qNorm = normalizeFoodNameForGraph(q);
  const meta = await loadNutritionMeta(ctx.uid);
  const userMatches = await resolveUserFoodMemoryMatches(meta, qNorm, 12);
  const graphPrefixHits = await queryFoodGraphByNormalizedPrefix(qNorm, 18);

  const earlyPage = dedupeSearchRows([userMatches, graphPrefixHits], 40);
  if (earlyPage.length >= 40) {
    const body: NutritionSearchResolved = {
      provider: deriveSearchResponseProvider(earlyPage),
      items: earlyPage,
    };
    searchResultCache.set(cacheKey, body, SEARCH_TTL_MS);
    return body;
  }

  const provider = await internalProviderSearch(query);
  if ("ok" in provider) {
    return provider;
  }

  const src: FoodNodeSource = provider.provider === "nutritionix" ? "nutritionix" : "dev_catalog";
  const remapped = await remapSearchItemsThroughFoodGraph(provider.items, src, (it) => it.id);

  const merged = dedupeSearchRows([userMatches, graphPrefixHits, remapped], 40);
  const body: NutritionSearchResolved = {
    provider: deriveSearchResponseProvider(merged),
    items: merged,
  };
  searchResultCache.set(cacheKey, body, SEARCH_TTL_MS);
  return body;
}

export async function resolveNutritionFoodSearch(
  query: string,
  ctx: NutritionFoodReadContext,
): Promise<NutritionSearchResolved | NutritionSearchFailure> {
  if (!isFoodGraphEnabled()) {
    return resolveNutritionFoodSearchLegacy(query);
  }
  return resolveNutritionFoodSearchWithGraph(query, ctx);
}

export async function resolveNutritionFoodDetail(id: string, ctx: NutritionFoodReadContext): Promise<NutritionFoodSearchItemDto | null> {
  void ctx.uid;
  const mode = getNutritionFoodProviderMode();
  const trimmed = id.trim();
  const devHit = getDevFoodById(trimmed);
  const nxParsed = parseOliNutritionixFoodId(trimmed);

  const detailHit = detailItemCache.get(`item:${trimmed}`);
  if (detailHit) return detailHit;

  if (isFoodGraphEnabled()) {
    const gHit = (await getFoodGraphDtoByOliId(trimmed)) ?? (await getFoodGraphDtoBySourceKey(trimmed));
    if (gHit) {
      detailItemCache.set(`item:${trimmed}`, gHit, DETAIL_TTL_MS);
      detailItemCache.set(`item:${gHit.id}`, gHit, DETAIL_TTL_MS);
      return gHit;
    }
  }

  if (mode === "dev") {
    return devHit ?? null;
  }

  if (!nxParsed) {
    if (mode === "hybrid") return devHit ?? null;
    return null;
  }

  const creds = getNutritionixCredentials();
  if (!creds) {
    return null;
  }

  try {
    if (nxParsed.kind === "branded") {
      const sourceKey = `${OLI_NUTRITIONIX_BRANDED_PREFIX}${nxParsed.nixItemId}`;
      const raw = await nutritionixGetItemByNixId(creds, nxParsed.nixItemId);
      const doc = firstFoodFromSearchItemResponse(raw);
      if (!doc) return null;
      const item = mapNutritionixFoodDocToItem(doc, sourceKey);
      const stored = await upsertFoodGraphFromSearchItem(item, "nutritionix", sourceKey);
      detailItemCache.set(`item:${trimmed}`, stored, DETAIL_TTL_MS);
      detailItemCache.set(`item:${stored.id}`, stored, DETAIL_TTL_MS);
      return stored;
    }

    const nameHit = commonTagNameCache.get(`tag:${nxParsed.tagId}`);
    const foodName = nameHit?.trim() ? nameHit : "";
    if (!foodName) return null;

    const rawNat = await nutritionixNaturalNutrients(creds, foodName);
    const doc = firstFoodFromNaturalNutrientsResponse(rawNat);
    if (!doc) return null;
    const stableId = `${OLI_NUTRITIONIX_COMMON_PREFIX}${nxParsed.tagId}`;
    const item = mapNutritionixFoodDocToItem(doc, stableId);
    const stored = await upsertFoodGraphFromSearchItem(item, "nutritionix", stableId);
    detailItemCache.set(`item:${trimmed}`, stored, DETAIL_TTL_MS);
    detailItemCache.set(`item:${stored.id}`, stored, DETAIL_TTL_MS);
    return stored;
  } catch (e) {
    if (e instanceof NutritionixProviderError && e.code === "NOT_FOUND") return null;
    throw e;
  }
}

export async function resolveNutritionFoodBarcode(barcode: string, ctx: NutritionFoodReadContext): Promise<NutritionFoodSearchItemDto | null> {
  void ctx.uid;
  const mode = getNutritionFoodProviderMode();
  const rawBc = barcode.trim();
  if (!rawBc) return null;

  const devHit = getDevFoodByBarcode(rawBc);

  const upcKey = `upc:${rawBc}`;
  const cached = detailItemCache.get(upcKey);
  if (cached) return cached;

  if (isFoodGraphEnabled()) {
    const digits = rawBc.replace(/\D/g, "");
    if (digits.length >= 8) {
      const gHit = await getFoodGraphDtoByBarcodeDigits(digits);
      if (gHit) {
        detailItemCache.set(upcKey, gHit, DETAIL_TTL_MS);
        detailItemCache.set(`item:${gHit.id}`, gHit, DETAIL_TTL_MS);
        return gHit;
      }
    }
  }

  if (mode === "dev") {
    const hit = devHit ?? null;
    if (hit && isFoodGraphEnabled()) {
      return upsertFoodGraphFromSearchItem(hit, "dev_catalog", hit.id);
    }
    return hit;
  }

  const creds = getNutritionixCredentials();

  if (mode === "nutritionix" && !creds) {
    logger.warn({ msg: "nutritionix_credentials_missing", context: "food_barcode" });
    return null;
  }

  if (mode === "hybrid" && !creds) {
    logger.warn({ msg: "nutritionix_credentials_missing_fallback_dev", context: "food_barcode" });
    const hit = devHit ?? null;
    if (hit && isFoodGraphEnabled()) {
      return upsertFoodGraphFromSearchItem(hit, "dev_catalog", hit.id);
    }
    return hit;
  }

  if (!creds) {
    return null;
  }

  try {
    const raw = await nutritionixGetItemByUpc(creds, rawBc);
    const doc = firstFoodFromSearchItemResponse(raw);
    if (!doc) {
      if (mode === "hybrid") {
        const hit = devHit ?? null;
        if (hit && isFoodGraphEnabled()) {
          return upsertFoodGraphFromSearchItem(hit, "dev_catalog", hit.id);
        }
        return hit;
      }
      return null;
    }
    const nixId = typeof doc["nix_item_id"] === "string" ? doc["nix_item_id"].trim() : "";
    const oliId =
      nixId.length > 0 ? `${OLI_NUTRITIONIX_BRANDED_PREFIX}${nixId}` : `nutritionix:upc:${rawBc}`;
    const item = mapNutritionixFoodDocToItem(doc, oliId);
    const sourceKey = nixId.length > 0 ? `${OLI_NUTRITIONIX_BRANDED_PREFIX}${nixId}` : `nutritionix:upc:${rawBc}`;
    const stored = await upsertFoodGraphFromSearchItem(item, "nutritionix", sourceKey);
    detailItemCache.set(upcKey, stored, DETAIL_TTL_MS);
    detailItemCache.set(`item:${stored.id}`, stored, DETAIL_TTL_MS);
    return stored;
  } catch (e) {
    if (e instanceof NutritionixProviderError) {
      if (e.code === "NOT_FOUND") {
        if (mode === "hybrid") {
          const hit = devHit ?? null;
          if (hit && isFoodGraphEnabled()) {
            return upsertFoodGraphFromSearchItem(hit, "dev_catalog", hit.id);
          }
          return hit;
        }
        return null;
      }
      if (mode === "hybrid") {
        logger.warn({
          msg: "nutritionix_barcode_fallback_dev",
          code: e.code,
          httpStatus: e.httpStatus,
        });
        const hit = devHit ?? null;
        if (hit && isFoodGraphEnabled()) {
          return upsertFoodGraphFromSearchItem(hit, "dev_catalog", hit.id);
        }
        return hit;
      }
      throw e;
    }
    throw e;
  }
}
