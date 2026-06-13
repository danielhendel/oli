import { z } from "zod";
import {
  foodGraphSourceSchema,
  foodServingSchema,
  nutritionBasisSchema,
  nutritionPer100gSchema,
  nutritionProductTypeSchema,
  processingClassSchema,
} from "./nutritionProduct";

/** Read-model item returned by GET /users/me/nutrition/food-search (dev catalog or future proxy). */
export const nutritionFoodSearchItemDtoSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    brand: z.string().optional(),
    servingLabel: z.string().min(1),
    caloriesKcal: z.number().finite().nonnegative(),
    proteinG: z.number().finite().nonnegative(),
    carbsG: z.number().finite().nonnegative(),
    fatG: z.number().finite().nonnegative(),
    fiberG: z.number().finite().nonnegative().optional(),
    sugarG: z.number().finite().nonnegative().optional(),
    sodiumMg: z.number().finite().nonnegative().optional(),
    /** Optional stable barcode for dev lookup (not vendor-specific canonical fields). */
    barcode: z.string().min(1).max(32).optional(),
    /** Client-computed fingerprint when using FoodProvider abstraction. */
    foodHash: z.string().min(1).max(80).optional(),
    /** Product-first classification (food vs supplement). */
    productType: nutritionProductTypeSchema.optional(),
    /** Reference store id when the product is store-branded. */
    storeId: z.string().min(1).optional(),
    // Food Graph Foundation (Sprint 1, additive/optional — carried for the
    // serving conversion engine, attribution UI, and search ranking).
    basis: nutritionBasisSchema.optional(),
    per100g: nutritionPer100gSchema.optional(),
    servings: z.array(foodServingSchema).optional(),
    source: foodGraphSourceSchema.optional(),
    confidence: z.number().finite().min(0).max(1).optional(),
    attributionRequired: z.boolean().optional(),
    processingClass: processingClassSchema.optional(),
    potassiumMg: z.number().finite().nonnegative().optional(),
    caffeineMg: z.number().finite().nonnegative().optional(),
    alcoholG: z.number().finite().nonnegative().optional(),
  })
  .strip();

export type NutritionFoodSearchItemDto = z.infer<typeof nutritionFoodSearchItemDtoSchema>;

/** Which catalog produced this read-model row (Oli API may proxy Nutritionix server-side). */
export const nutritionFoodReadProviderSchema = z.enum(["dev_catalog", "nutritionix", "oli_food_graph"]);

export const nutritionFoodSearchResponseDtoSchema = z
  .object({
    schemaVersion: z.literal(1),
    provider: nutritionFoodReadProviderSchema,
    items: z.array(nutritionFoodSearchItemDtoSchema),
  })
  .strip();

export type NutritionFoodSearchResponseDto = z.infer<typeof nutritionFoodSearchResponseDtoSchema>;

export const nutritionFoodDetailResponseDtoSchema = nutritionFoodSearchItemDtoSchema
  .extend({
    schemaVersion: z.literal(1),
    provider: nutritionFoodReadProviderSchema,
  })
  .strip();

export type NutritionFoodDetailResponseDto = z.infer<typeof nutritionFoodDetailResponseDtoSchema>;
