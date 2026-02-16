// lib/util/makeFactId.ts
// Deterministic id helper for facts (kind + date).
export function makeFactId(kind: string, dateYmd: string): string {
    const cleanKind = kind.trim().toLowerCase();
    return `${cleanKind}:${dateYmd}`;
  }
  