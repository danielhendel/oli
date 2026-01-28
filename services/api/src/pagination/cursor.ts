// services/api/src/pagination/cursor.ts
import { z } from "zod";

const cursorSchema = z
  .object({
    start: z.string().min(1),
    id: z.string().min(1),
  })
  .strict();

export type Cursor = z.infer<typeof cursorSchema>;

function base64UrlEncode(input: string): string {
  return Buffer.from(input, "utf8").toString("base64url");
}

function base64UrlDecode(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8");
}

export function encodeCursor(c: Cursor): string {
  const parsed = cursorSchema.parse(c);
  return base64UrlEncode(JSON.stringify(parsed));
}

export function decodeCursor(raw: string): { ok: true; cursor: Cursor } | { ok: false; error: string } {
  try {
    const json = base64UrlDecode(raw);
    const obj = JSON.parse(json) as unknown;
    const parsed = cursorSchema.safeParse(obj);
    if (!parsed.success) return { ok: false, error: "INVALID_CURSOR" };
    return { ok: true, cursor: parsed.data };
  } catch {
    return { ok: false, error: "INVALID_CURSOR" };
  }
}