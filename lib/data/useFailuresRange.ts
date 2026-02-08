// lib/data/useFailuresRange.ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getFailuresRange } from "@/lib/api/failures";
import type { FailureKind, GetOptions } from "@/lib/api/http";
import type { FailureListItemDto, FailureListResponseDto } from "@/lib/contracts/failure";
import { truthOutcomeFromApiResult } from "@/lib/data/truthOutcome";

type Ready = {
  items: FailureListItemDto[];
  nextCursor: string | null;
  truncated: boolean;
};

type State =
  | { status: "partial" }
  | { status: "error"; error: string; requestId: string | null; reason: FailureKind }
  | { status: "ready"; data: Ready };

export type UseFailuresRangeArgs = {
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
  limit?: number;
  cursor?: string;
};

export type UseFailuresRangeOptions = {
  enabled?: boolean;

  /**
   * "page" returns one API page (default).
   * "all" fetches sequential pages until exhausted or a hard cap is reached.
   */
  mode?: "page" | "all";

  /** Only applies when mode === "all" */
  maxItems?: number;
};

function sortByCreatedAtDesc(items: FailureListItemDto[]): FailureListItemDto[] {
  // Sorting is not filtering; Sprint 1 requires time-ordered failures.
  return [...items].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

function withUniqueCacheBust(opts: GetOptions | undefined, seq: number): GetOptions | undefined {
  const cb = opts?.cacheBust;
  if (!cb) return opts;
  return { ...opts, cacheBust: `${cb}:${seq}` };
}

async function fetchFailuresRangePage(input: {
  args: UseFailuresRangeArgs;
  token: string;
  opts?: GetOptions;
}): Promise<ReturnType<typeof truthOutcomeFromApiResult<FailureListResponseDto>>> {
  const res = await getFailuresRange(input.args, input.token, input.opts);
  return truthOutcomeFromApiResult(res);
}

export function useFailuresRange(
  args: UseFailuresRangeArgs,
  options?: UseFailuresRangeOptions,
): State & { refetch: (opts?: GetOptions) => void } {
  const enabled = options?.enabled ?? true;
  const mode = options?.mode ?? "page";
  const maxItems = options?.maxItems ?? 500;

  const { user, initializing, getIdToken } = useAuth();

  const argsRef = useRef(args);
  argsRef.current = args;

  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const modeRef = useRef(mode);
  modeRef.current = mode;

  const maxItemsRef = useRef(maxItems);
  maxItemsRef.current = maxItems;

  const reqSeq = useRef(0);

  const [state, setState] = useState<State>({ status: "partial" });
  const stateRef = useRef<State>(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const fetchOnce = useCallback(
    async (opts?: GetOptions) => {
      const seq = ++reqSeq.current;

      const safeSet = (next: State) => {
        if (seq === reqSeq.current) setState(next);
      };

      if (!enabledRef.current) {
        safeSet({ status: "ready", data: { items: [], nextCursor: null, truncated: false } });
        return;
      }

      if (initializing || !user) {
        if (stateRef.current.status !== "ready") safeSet({ status: "partial" });
        return;
      }

      const token = await getIdToken(false);
      if (seq !== reqSeq.current) return;

      if (!token) {
        if (stateRef.current.status === "ready") return;
        safeSet({ status: "error", error: "No auth token", requestId: null, reason: "unknown" });
        return;
      }

      if (stateRef.current.status !== "ready") safeSet({ status: "partial" });

      const optsUnique = withUniqueCacheBust(opts, seq);

      if (modeRef.current === "page") {
        // exactOptionalPropertyTypes: do NOT pass opts: undefined
        const outcome = await fetchFailuresRangePage({
          args: argsRef.current,
          token,
          ...(optsUnique ? { opts: optsUnique } : {}),
        });

        if (seq !== reqSeq.current) return;

        if (outcome.status === "ready") {
          safeSet({
            status: "ready",
            data: {
              items: sortByCreatedAtDesc(outcome.data.items),
              nextCursor: outcome.data.nextCursor,
              truncated: false,
            },
          });
          return;
        }

        if (outcome.status === "missing") {
          safeSet({ status: "ready", data: { items: [], nextCursor: null, truncated: false } });
          return;
        }

        safeSet({ status: "error", error: outcome.error, requestId: outcome.requestId, reason: outcome.reason });
        return;
      }

      // mode === "all"
      let all: FailureListItemDto[] = [];
      let cursor: string | null = argsRef.current.cursor ?? null;
      let truncated = false;

      while (true) {
        const pageArgs: UseFailuresRangeArgs = {
          start: argsRef.current.start,
          end: argsRef.current.end,
          ...(typeof argsRef.current.limit === "number" ? { limit: argsRef.current.limit } : {}),
          ...(cursor ? { cursor } : {}),
        };

        // exactOptionalPropertyTypes: do NOT pass opts: undefined
        const outcome = await fetchFailuresRangePage({
          args: pageArgs,
          token,
          ...(optsUnique ? { opts: optsUnique } : {}),
        });

        if (seq !== reqSeq.current) return;

        if (outcome.status === "missing") {
          safeSet({ status: "ready", data: { items: [], nextCursor: null, truncated: false } });
          return;
        }

        if (outcome.status === "error") {
          safeSet({ status: "error", error: outcome.error, requestId: outcome.requestId, reason: outcome.reason });
          return;
        }

        all = all.concat(outcome.data.items);
        cursor = outcome.data.nextCursor;

        if (all.length >= maxItemsRef.current) {
          truncated = cursor !== null;
          break;
        }

        if (!cursor) break;
      }

      const capped = all.length > maxItemsRef.current ? all.slice(0, maxItemsRef.current) : all;

      safeSet({
        status: "ready",
        data: {
          items: sortByCreatedAtDesc(capped),
          nextCursor: cursor,
          truncated,
        },
      });
    },
    [getIdToken, initializing, user],
  );

  useEffect(() => {
    void fetchOnce();
  }, [fetchOnce, args.start, args.end, args.limit, args.cursor, enabled, mode, maxItems, user?.uid]);

  return useMemo(() => ({ ...state, refetch: fetchOnce }), [state, fetchOnce]);
}
