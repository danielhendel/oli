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
  })
  .strip();

export type NutritionProduct = z.infer<typeof nutritionProductSchema>;
