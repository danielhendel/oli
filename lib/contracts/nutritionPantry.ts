import { z } from "zod";
import { nutritionProductTypeSchema } from "./nutritionProduct";

const pantryMacrosSchema = z
  .object({
    caloriesKcal: z.number().finite().nonnegative(),
    proteinG: z.number().finite().nonnegative(),
    carbsG: z.number().finite().nonnegative(),
    fatG: z.number().finite().nonnegative(),
  })
  .strip();

/** User-owned pantry item at `users/{uid}/pantry/{itemId}`. */
export const pantryItemSchema = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1),
    oliFoodId: z.string().min(1).optional(),
    storeId: z.string().min(1).optional(),
    productType: nutritionProductTypeSchema.optional(),
    servingLabel: z.string().min(1).optional(),
    defaultServings: z.number().finite().positive().optional(),
    macrosPerServing: pantryMacrosSchema,
    addedAt: z.string().min(1),
    schemaVersion: z.literal(1),
  })
  .strip();

export type PantryItem = z.infer<typeof pantryItemSchema>;

export const nutritionPantryListDtoSchema = z
  .object({
    schemaVersion: z.literal(1),
    items: z.array(pantryItemSchema),
  })
  .strip();

export type NutritionPantryListDto = z.infer<typeof nutritionPantryListDtoSchema>;

export const addPantryItemRequestSchema = z
  .object({
    label: z.string().min(1),
    oliFoodId: z.string().min(1).optional(),
    storeId: z.string().min(1).optional(),
    productType: nutritionProductTypeSchema.optional(),
    servingLabel: z.string().min(1).optional(),
    defaultServings: z.number().finite().positive().optional(),
    macrosPerServing: pantryMacrosSchema,
  })
  .strip();

export type AddPantryItemRequest = z.infer<typeof addPantryItemRequestSchema>;

/** Idempotent create response (mirrors createLabResultResponseDtoSchema). */
export const addPantryItemResponseDtoSchema = z
  .object({
    ok: z.literal(true),
    id: z.string().min(1),
    idempotentReplay: z.literal(true).optional(),
  })
  .strip();

export type AddPantryItemResponseDto = z.infer<typeof addPantryItemResponseDtoSchema>;
