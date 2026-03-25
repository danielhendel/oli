import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getRawEvents, getRawEvent } from "@/lib/api/usersMe";
import { parseWorkoutHistoryItem, type WorkoutHistoryItem } from "@/lib/data/workouts/parseWorkoutFromRawEvent";
import {
  resolveHistoryItemProductDomain,
  type WorkoutProductDomain,
} from "@/lib/data/workouts/workoutDomain";

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;
const HYDRATE_CONCURRENCY = 6;
const MAX_ITEMS_CAP = 2000;

export type WorkoutsHistoryState =
  | { status: "idle" }
  | { status: "partial" }
  | { status: "ready"; data: { items: WorkoutHistoryItem[]; nextCursor: string | null } }
  | { status: "error"; error: string; requestId: string | null };

export type UseWorkoutsHistoryResult = WorkoutsHistoryState & {
  refetch: () => void;
  loadMore: () => void;
};

export type UseWorkoutsHistoryOptions = {
  /** When set, only rows for this product domain are kept (still lists both raw kinds upstream). */
  productDomain?: WorkoutProductDomain;
};

async function hydrateInOrder(
  ids: string[],
  idToken: string,
  concurrency: number,
): Promise<{ items: WorkoutHistoryItem[]; error?: string; requestId?: string | null }> {
  const items: WorkoutHistoryItem[] = [];
  for (let i = 0; i < ids.length; i += concurrency) {
    const chunk = ids.slice(i, i + concurrency);
    const results = await Promise.all(chunk.map((id) => getRawEvent(id, idToken)));
    for (const res of results) {
      if (!res) continue;
      if (!res.ok) {
        return {
          items,
          error: res.error,
          requestId: res.requestId,
        };
      }
      items.push(parseWorkoutHistoryItem(res.json));
    }
  }
  return { items };
}

export function useWorkoutsHistory(
  limit: number = DEFAULT_PAGE_SIZE,
  options?: UseWorkoutsHistoryOptions,
): UseWorkoutsHistoryResult {
  const pageSize = Math.min(Math.max(1, limit), MAX_PAGE_SIZE);
  const productDomain = options?.productDomain;
  const { user, initializing, getIdToken } = useAuth();

  const [state, setState] = useState<WorkoutsHistoryState>({ status: "idle" });
  const loadingRef = useRef(false);
  const reqSeqRef = useRef(0);

  const fetchPage = useCallback(
    async (cursor: string | null, append: boolean) => {
      if (!user) return;
      const token = await getIdToken(false);
      if (!token) return;

      const seq = ++reqSeqRef.current;
      loadingRef.current = true;
      if (!append) setState({ status: "partial" });

      const kinds: string[] =
        productDomain != null ? ["workout", "strength_workout"] : ["workout"];
      const listOpts: { kinds: string[]; limit: number; cursor?: string } = {
        kinds,
        limit: pageSize,
      };
      if (cursor != null) listOpts.cursor = cursor;
      const listRes = await getRawEvents(token, listOpts);

      if (seq !== reqSeqRef.current) return;

      if (!listRes.ok) {
        loadingRef.current = false;
        setState({
          status: "error",
          error: listRes.error,
          requestId: listRes.requestId,
        });
        return;
      }

      const ids = listRes.json.items.map((i) => i.id);
      if (ids.length === 0) {
        loadingRef.current = false;
        if (append) {
          setState((prev) => {
            if (prev.status !== "ready") return prev;
            return {
              status: "ready",
              data: {
                items: prev.data.items,
                nextCursor: listRes.json.nextCursor,
              },
            };
          });
        } else {
          setState({
            status: "ready",
            data: { items: [], nextCursor: listRes.json.nextCursor },
          });
        }
        return;
      }

      const { items: newItems, error: hydrateError, requestId: hydrateRequestId } = await hydrateInOrder(
        ids,
        token,
        HYDRATE_CONCURRENCY,
      );

      if (seq !== reqSeqRef.current) return;

      if (hydrateError != null) {
        loadingRef.current = false;
        setState({
          status: "error",
          error: hydrateError,
          requestId: hydrateRequestId ?? null,
        });
        return;
      }

      const domainItems =
        productDomain != null
          ? newItems.filter((it) => resolveHistoryItemProductDomain(it) === productDomain)
          : newItems;

      setState((prev) => {
        const prevItems = prev.status === "ready" ? prev.data.items : [];
        const combined = append ? [...prevItems, ...domainItems] : domainItems;
        if (combined.length > MAX_ITEMS_CAP) {
          loadingRef.current = false;
          return {
            status: "error",
            error: `Maximum ${MAX_ITEMS_CAP} workouts allowed`,
            requestId: null,
          };
        }
        loadingRef.current = false;
        return {
          status: "ready",
          data: {
            items: combined,
            nextCursor: listRes.json.nextCursor,
          },
        };
      });
    },
    [user, getIdToken, pageSize, productDomain],
  );

  const refetch = useCallback(() => {
    if (initializing || !user) return;
    reqSeqRef.current += 1;
    void fetchPage(null, false);
  }, [initializing, user, fetchPage]);

  const loadMore = useCallback(() => {
    if (state.status !== "ready" || !state.data.nextCursor || loadingRef.current || initializing || !user) return;
    void fetchPage(state.data.nextCursor, true);
  }, [state, initializing, user, fetchPage]);

  const initialFetchedRef = useRef(false);
  useEffect(() => {
    if (!user || initializing) {
      if (!user) initialFetchedRef.current = false;
      return;
    }
    if (!initialFetchedRef.current) {
      initialFetchedRef.current = true;
      void fetchPage(null, false);
    }
  }, [user?.uid, initializing, fetchPage]);

  return {
    ...state,
    refetch,
    loadMore,
  };
}
