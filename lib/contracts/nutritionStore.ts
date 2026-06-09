import { z } from "zod";

/** Reference store catalog at `system/stores/{storeId}` (public read, API/admin write). */
export const nutritionStoreSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    /** Optional short label for UI chips (e.g. "Stop & Shop"). */
    shortName: z.string().min(1).optional(),
    schemaVersion: z.literal(1),
  })
  .strip();

export type NutritionStore = z.infer<typeof nutritionStoreSchema>;

export const nutritionStoreListDtoSchema = z
  .object({
    schemaVersion: z.literal(1),
    items: z.array(nutritionStoreSchema),
  })
  .strip();

export type NutritionStoreListDto = z.infer<typeof nutritionStoreListDtoSchema>;
