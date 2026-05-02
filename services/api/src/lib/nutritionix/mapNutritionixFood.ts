/**
 * Pure Nutritionix JSON → Oli nutrition food DTOs (stable ids, deterministic mapping).
 */

import { z } from "zod";
import type { NutritionFoodSearchItemDto } from "@oli/contracts/nutritionFoodSearch";

export const OLI_NUTRITIONIX_BRANDED_PREFIX = "nutritionix:branded:";
export const OLI_NUTRITIONIX_COMMON_PREFIX = "nutritionix:common:";

const round2 = (n: number): number => Math.round(n * 100) / 100;

function num(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim().length > 0) {
    const x = Number(v);
    if (Number.isFinite(x)) return x;
  }
  return 0;
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

const instantBrandedRowSchema = z
  .object({
    food_name: z.string().optional(),
    brand_name: z.string().optional(),
    nix_item_id: z.string().optional(),
    nf_calories: z.union([z.number(), z.string()]).optional(),
    serving_qty: z.union([z.number(), z.string()]).optional(),
    serving_unit: z.string().optional(),
  })
  .passthrough();

const instantCommonRowSchema = z
  .object({
    food_name: z.string().optional(),
    tag_id: z.union([z.string(), z.number()]).optional(),
    nf_calories: z.union([z.number(), z.string()]).optional(),
    serving_qty: z.union([z.number(), z.string()]).optional(),
    serving_unit: z.string().optional(),
  })
  .passthrough();

const instantResponseSchema = z
  .object({
    common: z.array(z.unknown()).optional(),
    branded: z.array(z.unknown()).optional(),
  })
  .passthrough();

const searchItemResponseSchema = z
  .object({
    foods: z.array(z.unknown()).optional(),
  })
  .passthrough();

/** Parsed Oli id for Nutritionix-backed foods (stable prefixes). */
export type ParsedOliNutritionixId =
  | { kind: "branded"; nixItemId: string }
  | { kind: "common"; tagId: string };

export function parseOliNutritionixFoodId(id: string): ParsedOliNutritionixId | null {
  const t = id.trim();
  if (t.startsWith(OLI_NUTRITIONIX_BRANDED_PREFIX)) {
    const rest = t.slice(OLI_NUTRITIONIX_BRANDED_PREFIX.length).trim();
    return rest.length > 0 ? { kind: "branded", nixItemId: rest } : null;
  }
  if (t.startsWith(OLI_NUTRITIONIX_COMMON_PREFIX)) {
    const rest = t.slice(OLI_NUTRITIONIX_COMMON_PREFIX.length).trim();
    return rest.length > 0 ? { kind: "common", tagId: rest } : null;
  }
  return null;
}

export function mapInstantSearchBody(body: unknown, limit: number): NutritionFoodSearchItemDto[] {
  const parsed = instantResponseSchema.safeParse(body);
  if (!parsed.success) return [];

  const out: NutritionFoodSearchItemDto[] = [];

  const branded = parsed.data.branded ?? [];
  for (const row of branded) {
    if (out.length >= limit) break;
    const b = instantBrandedRowSchema.safeParse(row);
    if (!b.success) continue;
    const nixId = str(b.data.nix_item_id);
    if (!nixId) continue;
    const name = str(b.data.food_name) || "Food";
    const brand = str(b.data.brand_name);
    const kcal = Math.max(0, num(b.data.nf_calories));
    const qty = num(b.data.serving_qty);
    const unit = str(b.data.serving_unit) || "serving";
    const servingLabel =
      qty > 0 && unit.length > 0 ? `${qty} ${unit}` : unit.length > 0 ? unit : "1 serving";

    out.push({
      id: `${OLI_NUTRITIONIX_BRANDED_PREFIX}${nixId}`,
      name,
      ...(brand.length > 0 ? { brand } : {}),
      servingLabel,
      caloriesKcal: round2(kcal),
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
    });
  }

  const common = parsed.data.common ?? [];
  for (const row of common) {
    if (out.length >= limit) break;
    const c = instantCommonRowSchema.safeParse(row);
    if (!c.success) continue;
    const tagRaw = c.data.tag_id;
    const tagId = tagRaw === undefined || tagRaw === null ? "" : String(tagRaw).trim();
    if (!tagId) continue;
    const name = str(c.data.food_name) || "Food";
    const kcal = Math.max(0, num(c.data.nf_calories));
    const qty = num(c.data.serving_qty);
    const unit = str(c.data.serving_unit) || "serving";
    const servingLabel =
      qty > 0 && unit.length > 0 ? `${qty} ${unit}` : unit.length > 0 ? unit : "1 serving";

    out.push({
      id: `${OLI_NUTRITIONIX_COMMON_PREFIX}${tagId}`,
      name,
      servingLabel,
      caloriesKcal: round2(kcal),
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
    });
  }

  return out;
}

function macrosFromFoodDoc(doc: Record<string, unknown>): Pick<
  NutritionFoodSearchItemDto,
  "caloriesKcal" | "proteinG" | "carbsG" | "fatG" | "fiberG" | "sugarG" | "sodiumMg"
> {
  const caloriesKcal = Math.max(0, round2(num(doc["nf_calories"])));
  const proteinG = Math.max(0, round2(num(doc["nf_protein"])));
  const carbsG = Math.max(0, round2(num(doc["nf_total_carbohydrate"])));
  const fatG = Math.max(0, round2(num(doc["nf_total_fat"])));
  const fiberGRaw = doc["nf_dietary_fiber"];
  const sugarGRaw = doc["nf_sugars"];
  const sodiumMgRaw = doc["nf_sodium"];

  const out: Pick<
    NutritionFoodSearchItemDto,
    "caloriesKcal" | "proteinG" | "carbsG" | "fatG" | "fiberG" | "sugarG" | "sodiumMg"
  > = {
    caloriesKcal,
    proteinG,
    carbsG,
    fatG,
  };

  if (fiberGRaw !== undefined && fiberGRaw !== null && String(fiberGRaw).length > 0) {
    out.fiberG = Math.max(0, round2(num(fiberGRaw)));
  }
  if (sugarGRaw !== undefined && sugarGRaw !== null && String(sugarGRaw).length > 0) {
    out.sugarG = Math.max(0, round2(num(sugarGRaw)));
  }
  if (sodiumMgRaw !== undefined && sodiumMgRaw !== null && String(sodiumMgRaw).length > 0) {
    out.sodiumMg = Math.max(0, round2(num(sodiumMgRaw)));
  }

  return out;
}

function servingLabelFromDoc(doc: Record<string, unknown>): string {
  const qty = num(doc["serving_qty"]);
  const unit = str(doc["serving_unit"]);
  if (qty > 0 && unit.length > 0) return `${qty} ${unit}`;
  if (unit.length > 0) return unit;
  const wg = num(doc["serving_weight_grams"]);
  if (wg > 0) return `${round2(wg)} g`;
  return "1 serving";
}

/**
 * Maps `/v2/search/item` or `/v2/natural/nutrients` single food document to search row shape + stable id.
 */
export function mapNutritionixFoodDocToItem(
  doc: Record<string, unknown>,
  oliId: string,
): NutritionFoodSearchItemDto {
  const name = str(doc["food_name"]) || "Food";
  const brandRaw = str(doc["brand_name"]);
  const upc = str(doc["nf_upc"]) || str(doc["upc"]);
  const macros = macrosFromFoodDoc(doc);

  const item: NutritionFoodSearchItemDto = {
    id: oliId,
    name,
    servingLabel: servingLabelFromDoc(doc),
    caloriesKcal: macros.caloriesKcal,
    proteinG: macros.proteinG,
    carbsG: macros.carbsG,
    fatG: macros.fatG,
    ...(brandRaw.length > 0 ? { brand: brandRaw } : {}),
    ...(macros.fiberG !== undefined ? { fiberG: macros.fiberG } : {}),
    ...(macros.sugarG !== undefined ? { sugarG: macros.sugarG } : {}),
    ...(macros.sodiumMg !== undefined ? { sodiumMg: macros.sodiumMg } : {}),
    ...(upc.length > 0 ? { barcode: upc.slice(0, 32) } : {}),
  };

  return item;
}

export function firstFoodFromSearchItemResponse(body: unknown): Record<string, unknown> | null {
  const parsed = searchItemResponseSchema.safeParse(body);
  if (!parsed.success) return null;
  const foods = parsed.data.foods ?? [];
  const first = foods[0];
  if (!first || typeof first !== "object") return null;
  return first as Record<string, unknown>;
}

export function firstFoodFromNaturalNutrientsResponse(body: unknown): Record<string, unknown> | null {
  return firstFoodFromSearchItemResponse(body);
}
