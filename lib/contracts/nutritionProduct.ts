import { z } from "zod";

/** Product type for Oli Food Graph nodes and search read models. */
export const nutritionProductTypeSchema = z.enum(["food", "supplement"]);

export type NutritionProductType = z.infer<typeof nutritionProductTypeSchema>;

const macrosPerServingSchema = z
  .object({
    caloriesKcal: z.number().finite().nonnegative(),
    proteinG: z.number().finite().nonnegative(),
    carbsG: z.number().finite().nonnegative(),
    fatG: z.number().finite().nonnegative(),
    fiberG: z.number().finite().nonnegative().optional(),
    sugarG: z.number().finite().nonnegative().optional(),
    sodiumMg: z.number().finite().nonnegative().optional(),
  })
  .strip();

// ---------------------------------------------------------------------------
// Food Graph Foundation (Sprint 1, additive)
//
// Canonical nutrition is stored per 100 g (or per 100 mL for liquids) plus a
// list of structured `servings` carrying gram weights. Macros for any logged
// quantity are derived deterministically from `per100g`, never stored as the
// source of truth. These additions are additive-only and never break existing
// readers (all new fields are optional on the persisted/served shapes).
// ---------------------------------------------------------------------------

/** Canonical per-100g (or per-100mL) nutrition basis. */
export const nutritionPer100gSchema = z
  .object({
    caloriesKcal: z.number().finite().nonnegative(),
    proteinG: z.number().finite().nonnegative(),
    carbsG: z.number().finite().nonnegative(),
    fatG: z.number().finite().nonnegative(),
    fiberG: z.number().finite().nonnegative().optional(),
    sugarG: z.number().finite().nonnegative().optional(),
    sodiumMg: z.number().finite().nonnegative().optional(),
    potassiumMg: z.number().finite().nonnegative().optional(),
    caffeineMg: z.number().finite().nonnegative().optional(),
    alcoholG: z.number().finite().nonnegative().optional(),
  })
  .strip();

export type NutritionPer100g = z.infer<typeof nutritionPer100gSchema>;

/** Units supported by the serving conversion engine. */
export const servingUnitSchema = z.enum([
  "g",
  "oz",
  "lb",
  "ml",
  "cup",
  "tbsp",
  "tsp",
  "scoop",
  "piece",
  "slice",
  "container",
  "serving",
]);

export type ServingUnit = z.infer<typeof servingUnitSchema>;

/** A named, gram-weighted serving for a food/supplement node. */
export const foodServingSchema = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1),
    /** Weight of ONE of this serving, in grams. */
    grams: z.number().finite().positive(),
    /** Natural unit this serving represents (enables exact unit selection). */
    unit: servingUnitSchema.optional(),
    /** Household description (e.g. "egg", "scoop"). */
    household: z.string().min(1).optional(),
    isDefault: z.boolean().optional(),
  })
  .strip();

export type FoodServing = z.infer<typeof foodServingSchema>;

/** Whether the canonical basis is mass (per 100 g) or volume (per 100 mL). */
export const nutritionBasisSchema = z.enum(["mass", "volume"]);

export type NutritionBasis = z.infer<typeof nutritionBasisSchema>;

/** Origin of a Food Graph node. */
export const foodGraphSourceSchema = z.enum([
  "usda",
  "open",
  "curated",
  "manual",
  "dev_catalog",
  "nutritionix",
  "user",
]);

export type FoodGraphSource = z.infer<typeof foodGraphSourceSchema>;

/** NOVA food-processing classification (carried for future intelligence). */
export const processingClassSchema = z.enum(["nova1", "nova2", "nova3", "nova4", "unknown"]);

export type ProcessingClass = z.infer<typeof processingClassSchema>;

/** Source attribution + versioning for a Food Graph node. */
export const foodProvenanceSchema = z
  .object({
    source: foodGraphSourceSchema,
    sourceId: z.string().min(1).optional(),
    sourceVersion: z.string().min(1).optional(),
    importedAt: z.string().min(1).optional(),
    license: z.string().min(1).optional(),
  })
  .strip();

export type FoodProvenance = z.infer<typeof foodProvenanceSchema>;

/** A single active ingredient in a supplement dose. */
export const supplementActiveIngredientSchema = z
  .object({
    name: z.string().min(1),
    amount: z.number().finite().nonnegative(),
    unit: z.enum(["mg", "mcg", "g", "iu"]),
  })
  .strip();

export type SupplementActiveIngredient = z.infer<typeof supplementActiveIngredientSchema>;

/** Canonical product shape stored at `system/foodGraph/nodes/{oliFoodId}`. */
export const nutritionProductSchema = z
  .object({
    oliFoodId: z.string().min(1),
    name: z.string().min(1),
    brand: z.string().optional(),
    servingLabel: z.string().min(1),
    productType: nutritionProductTypeSchema,
    storeId: z.string().min(1).optional(),
    macrosPerServing: macrosPerServingSchema,
    barcode: z.string().min(1).max(32).optional(),
    schemaVersion: z.literal(1),
    // Food Graph Foundation (Sprint 1, additive/optional)
    basis: nutritionBasisSchema.optional(),
    per100g: nutritionPer100gSchema.optional(),
    servings: z.array(foodServingSchema).optional(),
    confidence: z.number().finite().min(0).max(1).optional(),
    provenance: foodProvenanceSchema.optional(),
    sourceVersion: z.string().min(1).optional(),
    attributionRequired: z.boolean().optional(),
    searchTokens: z.array(z.string().min(1)).optional(),
    aliases: z.array(z.string().min(1)).optional(),
    processingClass: processingClassSchema.optional(),
    caffeineMg: z.number().finite().nonnegative().optional(),
    alcoholG: z.number().finite().nonnegative().optional(),
    activeIngredients: z.array(supplementActiveIngredientSchema).optional(),
    doseUnit: z.string().min(1).optional(),
  })
  .strip();

export type NutritionProduct = z.infer<typeof nutritionProductSchema>;

/**
 * Canonical input shape produced by source adapters / seed catalogs before an
 * `oliFoodId` is assigned and the node is persisted. One unified shape for
 * USDA, Open Food Facts, curated supplements, and manual foods.
 */
export const foodGraphNodeInputSchema = z
  .object({
    /** Stable per-source key (e.g. `usda:171287`, `open:upc:0123...`). */
    sourceKey: z.string().min(1),
    source: foodGraphSourceSchema,
    name: z.string().min(1),
    brand: z.string().min(1).optional(),
    productType: nutritionProductTypeSchema,
    basis: nutritionBasisSchema,
    per100g: nutritionPer100gSchema,
    servings: z.array(foodServingSchema).min(1),
    defaultServingLabel: z.string().min(1).optional(),
    barcode: z.string().min(1).max(32).optional(),
    storeId: z.string().min(1).optional(),
    confidence: z.number().finite().min(0).max(1),
    attributionRequired: z.boolean(),
    sourceVersion: z.string().min(1).optional(),
    searchTokens: z.array(z.string().min(1)).optional(),
    aliases: z.array(z.string().min(1)).optional(),
    processingClass: processingClassSchema.optional(),
    activeIngredients: z.array(supplementActiveIngredientSchema).optional(),
    doseUnit: z.string().min(1).optional(),
  })
  .strip();

export type FoodGraphNodeInput = z.infer<typeof foodGraphNodeInputSchema>;
