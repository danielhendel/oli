import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  addNutritionPantryItem,
  getNutritionPantry,
  removeNutritionPantryItem,
} from "@/lib/api/usersMe";
import type { AddPantryItemRequest, PantryItem } from "@oli/contracts/nutritionPantry";

export type UseNutritionPantryResult = {
  items: readonly PantryItem[];
  loading: boolean;
  errorMessage: string | null;
  refresh: () => Promise<void>;
  addItem: (body: AddPantryItemRequest) => Promise<boolean>;
  removeItem: (itemId: string) => Promise<boolean>;
};

// Caller-generated Idempotency-Key (mirrors app/(app)/labs/log.tsx repo-truth pattern).
function makeIdempotencyKey(): string {
  return `pantry-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function useNutritionPantry(): UseNutritionPantryResult {
  const { getIdToken } = useAuth();
  const [items, setItems] = useState<readonly PantryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const token = await getIdToken();
      if (!token) {
        setItems([]);
        setErrorMessage("Sign in required");
        return;
      }
      const res = await getNutritionPantry(token);
      if (!res.ok) {
        setErrorMessage(res.error ?? "Could not load pantry");
        return;
      }
      setItems(res.json.items);
    } catch {
      setErrorMessage("Could not load pantry");
    } finally {
      setLoading(false);
    }
  }, [getIdToken]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addItem = useCallback(
    async (body: AddPantryItemRequest): Promise<boolean> => {
      try {
        const token = await getIdToken();
        if (!token) return false;
        const res = await addNutritionPantryItem(body, token, makeIdempotencyKey());
        if (!res.ok) {
          setErrorMessage(res.error ?? "Could not add item");
          return false;
        }
        // Server is authoritative for the stored shape; re-read after idempotent write.
        await refresh();
        return true;
      } catch {
        setErrorMessage("Could not add item");
        return false;
      }
    },
    [getIdToken, refresh],
  );

  const removeItem = useCallback(
    async (itemId: string): Promise<boolean> => {
      try {
        const token = await getIdToken();
        if (!token) return false;
        const res = await removeNutritionPantryItem(itemId, token);
        if (!res.ok) {
          setErrorMessage(res.error ?? "Could not remove item");
          return false;
        }
        setItems((prev) => prev.filter((x) => x.id !== itemId));
        return true;
      } catch {
        setErrorMessage("Could not remove item");
        return false;
      }
    },
    [getIdToken],
  );

  return { items, loading, errorMessage, refresh, addItem, removeItem };
}
