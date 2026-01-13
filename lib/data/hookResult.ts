// lib/data/hookResult.ts

export type LoadStatus = "loading" | "ready" | "empty" | "invalid" | "error";

export type HookState<T> =
  | { status: "loading" }
  | { status: "ready"; data: T }
  | { status: "empty"; data: T }
  | { status: "invalid"; error: string; requestId: string | null }
  | { status: "error"; error: string; requestId: string | null };
