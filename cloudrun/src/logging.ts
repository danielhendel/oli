// cloudrun/src/logging.ts
import { randomUUID } from "node:crypto";

/** Minimal shape of an Express-like request for header lookup. */
export interface ReqLike {
  get?: (name: string) => string | undefined;
  header?: (name: string) => string | number | string[] | undefined;
  headers?: Record<string, string | string[] | undefined>;
}

/** Resolve a header value from various request shapes (case-insensitive). */
function getHeader(req: ReqLike | undefined, name: string): string | undefined {
  if (!req) return undefined;
  // Express helpers, normalized to string
  const fromGet = req.get?.(name);
  if (typeof fromGet === "string") return fromGet;

  const fromHeader = req.header?.(name);
  if (typeof fromHeader === "string") return fromHeader;
  if (typeof fromHeader === "number") return String(fromHeader);
  if (Array.isArray(fromHeader)) return fromHeader[0];

  // Raw headers bag
  const bag = req.headers;
  if (bag) {
    const key = Object.keys(bag).find((k) => k.toLowerCase() === name.toLowerCase());
    const val = key ? bag[key] : undefined;
    if (typeof val === "string") return val;
    if (Array.isArray(val)) return val[0];
    if (typeof val === "number") return String(val);
  }
  return undefined;
}

function makeRequestId(req?: ReqLike): string {
  return (
    getHeader(req, "x-request-id") ||
    getHeader(req, "x-cloud-trace-context") ||
    // Fallback: robust random id
    safeRandomId()
  );
}

function safeRandomId(): string {
  try {
    return randomUUID();
  } catch {
    return Math.random().toString(36).slice(2);
  }
}

type Extra = Record<string, unknown>;

export type Logger = {
  info: (msg: string, extra?: Extra) => void;
  error: (msg: string, err?: unknown, extra?: Extra) => void;
  requestId: string;
};

/** Create a structured logger bound to a request (Cloud Run / Express). */
export function withReq(req?: ReqLike): Logger {
  const requestId = makeRequestId(req);

  const base = { requestId };

  return {
    info: (msg: string, extra: Extra = {}) => {
      // Avoid leaking non-serializable fields
      console.log(
        JSON.stringify({
          level: "info",
          msg,
          ...base,
          ...extra,
        })
      );
    },

    error: (msg: string, err?: unknown, extra: Extra = {}) => {
      const errPayload =
        err instanceof Error
          ? { error: err.message, name: err.name, stack: err.stack }
          : err != null
          ? { error: String(err) }
          : {};

      console.error(
        JSON.stringify({
          level: "error",
          msg,
          ...base,
          ...errPayload,
          ...extra,
        })
      );
    },

    requestId,
  };
}
