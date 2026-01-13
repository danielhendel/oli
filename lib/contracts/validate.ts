// lib/contracts/validate.ts

import type { ZodSchema } from "zod";

/**
 * Fail-closed runtime validation for server responses.
 *
 * - Returns parsed (safe) value on success
 * - Returns a short, user-safe error message on failure
 */
export function validateOrExplain<T>(
  schema: ZodSchema<T>,
  value: unknown,
): { ok: true; value: T } | { ok: false; error: string } {
  const parsed = schema.safeParse(value);
  if (parsed.success) {
    return { ok: true, value: parsed.data };
  }

  const issues = parsed.error.issues
    .slice(0, 3)
    .map((i) => {
      const path = i.path.length ? i.path.join(".") : "<root>";
      return `${path}: ${i.message}`;
    })
    .join("; ");

  return {
    ok: false,
    error: `Invalid response shape: ${issues}`,
  };
}
