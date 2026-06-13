/**
 * Nutrition food read: Oli Food Graph (primary when enabled) + user memory + TTL cache + dev / Nutritionix.
 */

import type { NutritionFoodSearchItemDto } from "@oli/contracts/nutritionFoodSearch";
import { defaultNutritionMetaDto, nutritionMetaDtoSchema, type NutritionMetaDto } from "@oli/contracts/nutritionMeta";
import { pantryItemSchema, type PantryItem } from "@oli/contracts/nutritionPantry";
import {
  getDevFoodByBarcode,
  getDevFoodById,
  searchDevFoodCatalog,
} from "../nutritionDevFoodCatalog";
import { logger } from "../logger";
import { userNutritionMetaStateDoc, userPantryCollection } from "../../db";
import { normalizeFoodNameForGraph } from "../foodGraphNormalize";
import { isFoodGraphEnabled } from "../foodGraphIds";
import {
  getFoodGraphDtoByBarcodeDigits,
  getFoodGraphDtoByOliId,
  getFoodGraphDtoBySourceKey,
  queryFoodGraphByNormalizedPrefix,
  queryFoodGraphByTokens,
  remapSearchItemsThroughFoodGraph,
  resolveUserFoodMemoryMatches,
  upsertFoodGraphFromSearchItem,
  type FoodNodeSource,
} from "../oliFoodGraph";
import { bestFoodMatch } from "../foodSearch/foodTextMatch";
import { buildFoodSearchTokens } from "../foodSearch/searchTokens";
import { rankFoodSearchResults, type RankCandidate } from "../foodSearch/searchRanking";
import { getSeedFoodById, getSeedSearchDtos } from "../foodSearch/seedFoodSearch";
import {
  fetchOpenFoodFactsProduct,
  isOpenFoodFactsEnabled,
  OpenFoodFactsError,
} from "../foodSources/openFoodFactsClient";
import { mapOpenFoodFactsProductToFoodGraphNode } from "../foodSources/openFoodFactsAdapter";
import { foodGraphNodeInputToSearchDto } from "../foodSources/foodGraphNodeMapper";
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

async function loadPantryItems(uid: string): Promise<PantryItem[]> {
  try {
    const snap = await userPantryCollection(uid).get();
    const out: PantryItem[] = [];
    for (const doc of snap.docs) {
      const raw = doc.data() as Record<string, unknown>;
      const parsed = pantryItemSchema.safeParse({ ...raw, id: typeof raw.id === "string" ? raw.id : doc.id });
      if (parsed.success) out.push(parsed.data);
    }
    return out;
  } catch (e) {
    logger.warn({ msg: "pantry_load_failed_food_read", uid, err: e instanceof Error ? e.message.slice(0, 160) : String(e) });
    return [];
  }
}

function pantryItemToSearchDto(p: PantryItem): NutritionFoodSearchItemDto {
  return {
    id: p.oliFoodId ?? p.id,
    name: p.label,
    servingLabel: p.servingLabel ?? "1 serving",
    caloriesKcal: p.macrosPerServing.caloriesKcal,
    proteinG: p.macrosPerServing.proteinG,
    carbsG: p.macrosPerServing.carbsG,
    fatG: p.macrosPerServing.fatG,
    ...(p.productType !== undefined ? { productType: p.productType } : {}),
    ...(p.storeId !== undefined ? { storeId: p.storeId } : {}),
  };
}

interface MembershipSets {
  favorites: Set<string>;
  recents: Set<string>;
  pantry: Set<string>;
}

function buildMembershipSets(meta: NutritionMetaDto, pantry: PantryItem[]): MembershipSets {
  const favorites = new Set<string>();
  const recents = new Set<string>();
  const pantrySet = new Set<string>();
  for (const f of meta.favoriteFoods) {
    if (f.oliFoodId) favorites.add(f.oliFoodId);
    favorites.add(f.id);
  }
  for (const r of meta.recentFoods) {
    if (r.oliFoodId) recents.add(r.oliFoodId);
    recents.add(r.id);
  }
  for (const p of pantry) {
    if (p.oliFoodId) pantrySet.add(p.oliFoodId);
    pantrySet.add(p.id);
  }
  return { favorites, recents, pantry: pantrySet };
}

function toRankCandidate(item: NutritionFoodSearchItemDto, query: string, sets: MembershipSets, forcePantry = false): RankCandidate {
  const fields = item.brand ? [item.name, item.brand] : [item.name];
  const match = bestFoodMatch(query, fields);
  return {
    item,
    isFavorite: sets.favorites.has(item.id),
    isPantry: forcePantry || sets.pantry.has(item.id),
    isRecent: sets.recents.has(item.id),
    matchClass: match.matchClass,
    matchScore: match.score,
  };
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

function buildEmptyQuerySearch(
  pantryDtos: NutritionFoodSearchItemDto[],
  sets: MembershipSets,
): NutritionSearchResolved {
  // No query → curated default surface: pantry first, then the P0 seed catalog.
  const candidates: RankCandidate[] = [
    ...pantryDtos.map((item) => ({
      item,
      isFavorite: sets.favorites.has(item.id),
      isPantry: true,
      isRecent: sets.recents.has(item.id),
      matchClass: "token" as const,
      matchScore: 0,
    })),
    ...getSeedSearchDtos().map((item) => ({
      item,
      isFavorite: sets.favorites.has(item.id),
      isPantry: sets.pantry.has(item.id),
      isRecent: sets.recents.has(item.id),
      matchClass: "token" as const,
      matchScore: 0,
    })),
  ];
  const items = rankFoodSearchResults(candidates, 40);
  return { provider: deriveSearchResponseProvider(items), items };
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
  const pantry = await loadPantryItems(ctx.uid);
  const sets = buildMembershipSets(meta, pantry);
  const pantryDtos = pantry.map(pantryItemToSearchDto);

  if (q.length === 0) {
    const body = buildEmptyQuerySearch(pantryDtos, sets);
    searchResultCache.set(cacheKey, body, SEARCH_TTL_MS);
    return body;
  }

  const userMatches = await resolveUserFoodMemoryMatches(meta, qNorm, 12);
  const graphPrefixHits = await queryFoodGraphByNormalizedPrefix(qNorm, 18);
  const queryTokens = buildFoodSearchTokens({ name: q });
  const graphTokenHits = await queryFoodGraphByTokens(queryTokens, 18);

  // Provider (dev/Nutritionix) is the bottom layer. On failure we degrade to
  // local (seed/graph/memory) results and only surface the failure when there
  // is nothing else to show.
  const provider = await internalProviderSearch(query);
  let remapped: NutritionFoodSearchItemDto[] = [];
  let providerFailure: NutritionSearchFailure | null = null;
  if ("ok" in provider) {
    providerFailure = provider;
  } else {
    const src: FoodNodeSource = provider.provider === "nutritionix" ? "nutritionix" : "dev_catalog";
    remapped = await remapSearchItemsThroughFoodGraph(provider.items, src, (it) => it.id);
  }

  const pool: NutritionFoodSearchItemDto[] = [
    ...userMatches,
    ...graphPrefixHits,
    ...graphTokenHits,
    ...remapped,
    ...getSeedSearchDtos(),
  ];
  const candidates: RankCandidate[] = [
    ...pool.map((item) => toRankCandidate(item, q, sets)),
    ...pantryDtos.map((item) => toRankCandidate(item, q, sets, true)),
  ];

  const items = rankFoodSearchResults(candidates, 40);

  if (items.length === 0 && providerFailure) {
    return providerFailure;
  }

  const body: NutritionSearchResolved = {
    provider: deriveSearchResponseProvider(items),
    items,
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

  // In-memory P0 seed/supplement catalog. Seed DTOs are searchable but not
  // persisted to the Food Graph during search, so resolve them here before
  // falling back to the legacy dev catalog / Nutritionix.
  const seedHit = getSeedFoodById(trimmed);
  if (seedHit) {
    detailItemCache.set(`item:${trimmed}`, seedHit, DETAIL_TTL_MS);
    return seedHit;
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

/**
 * Open Food Facts barcode fallback: OFF lookup → normalize → persist into the
 * Food Graph (canonical UPC identity ensures no duplicate node). Returns the
 * stored DTO, or `null` on miss. Only runs when the Food Graph is enabled (we
 * must be able to persist) and OFF is enabled. Degrades gracefully on any OFF
 * transport error.
 */
async function tryOpenFoodFactsBarcode(rawBc: string, upcKey: string): Promise<NutritionFoodSearchItemDto | null> {
  if (!isFoodGraphEnabled() || !isOpenFoodFactsEnabled()) return null;
  const digits = rawBc.replace(/\D/g, "");
  if (digits.length < 8) return null;
  try {
    const product = await fetchOpenFoodFactsProduct(digits);
    if (!product) return null;
    const node = mapOpenFoodFactsProductToFoodGraphNode(product);
    if (!node) return null;
    const dto = foodGraphNodeInputToSearchDto(node);
    const stored = await upsertFoodGraphFromSearchItem(dto, "open", node.sourceKey);
    detailItemCache.set(upcKey, stored, DETAIL_TTL_MS);
    detailItemCache.set(`item:${stored.id}`, stored, DETAIL_TTL_MS);
    return stored;
  } catch (e) {
    if (e instanceof OpenFoodFactsError) {
      logger.warn({ msg: "open_food_facts_barcode_failed", code: e.code, ...(e.httpStatus !== undefined ? { httpStatus: e.httpStatus } : {}) });
      return null;
    }
    throw e;
  }
}

/** Dev curated barcode hit (persisted when graph enabled), else OFF fallback. */
async function devOrOpenFoodFactsBarcode(
  devHit: NutritionFoodSearchItemDto | null,
  rawBc: string,
  upcKey: string,
): Promise<NutritionFoodSearchItemDto | null> {
  if (devHit && isFoodGraphEnabled()) {
    return upsertFoodGraphFromSearchItem(devHit, "dev_catalog", devHit.id);
  }
  if (devHit) return devHit;
  return tryOpenFoodFactsBarcode(rawBc, upcKey);
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
    if (hit) return hit;
    // Graph hit + dev miss → Open Food Facts (Sprint 1 barcode source).
    return tryOpenFoodFactsBarcode(rawBc, upcKey);
  }

  const creds = getNutritionixCredentials();

  if (mode === "nutritionix" && !creds) {
    logger.warn({ msg: "nutritionix_credentials_missing", context: "food_barcode" });
    return null;
  }

  if (mode === "hybrid" && !creds) {
    logger.warn({ msg: "nutritionix_credentials_missing_fallback_dev", context: "food_barcode" });
    return devOrOpenFoodFactsBarcode(devHit ?? null, rawBc, upcKey);
  }

  if (!creds) {
    return null;
  }

  try {
    const raw = await nutritionixGetItemByUpc(creds, rawBc);
    const doc = firstFoodFromSearchItemResponse(raw);
    if (!doc) {
      if (mode === "hybrid") {
        return devOrOpenFoodFactsBarcode(devHit ?? null, rawBc, upcKey);
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
          return devOrOpenFoodFactsBarcode(devHit ?? null, rawBc, upcKey);
        }
        return null;
      }
      if (mode === "hybrid") {
        logger.warn({
          msg: "nutritionix_barcode_fallback_dev",
          code: e.code,
          httpStatus: e.httpStatus,
        });
        return devOrOpenFoodFactsBarcode(devHit ?? null, rawBc, upcKey);
      }
      throw e;
    }
    throw e;
  }
}
