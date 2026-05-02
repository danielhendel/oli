import { useCallback, useMemo } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { createDefaultFoodProvider } from "@/lib/nutrition/defaultFoodProvider";
import type { NutritionFoodDetailResponseDto } from "@oli/contracts/nutritionFoodSearch";

export function useNutritionBarcodeLookup() {
  const { getIdToken } = useAuth();
  const provider = useMemo(() => createDefaultFoodProvider(getIdToken), [getIdToken]);

  const lookup = useCallback(
    async (
      barcode: string,
    ): Promise<
      | { ok: true; data: NutritionFoodDetailResponseDto }
      | { ok: false; error: string; requestId: string | null }
    > => {
      try {
        const row = await provider.getFoodByBarcode(barcode);
        if (!row) {
          return { ok: false, error: "No food matched this barcode.", requestId: null };
        }
        return { ok: true, data: row };
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Lookup failed";
        return { ok: false, error: msg, requestId: null };
      }
    },
    [provider],
  );

  return { lookup };
}
