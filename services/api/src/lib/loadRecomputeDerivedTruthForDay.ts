/**
 * Loads the bundled `recomputeDerivedTruthForDay` implementation from @oli/functions at runtime.
 * Keeps the API TypeScript project boundary clean (no cross-package TS imports) while sharing one pipeline.
 */

import path from "node:path";
import { createRequire } from "node:module";

import type { Firestore } from "firebase-admin/firestore";

export type RecomputeDerivedTruthForDayInput = {
  db: Firestore;
  userId: string;
  dayKey: string;
  canonicalAnchorDay?: string;
  trigger:
    | { type: "factOnly"; rawEventId: string }
    | { type: "realtime"; eventId: string }
    | { type: "admin"; source: string };
};

let cachedFn: ((input: RecomputeDerivedTruthForDayInput) => Promise<void>) | undefined;

export function getRecomputeDerivedTruthForDay(): (input: RecomputeDerivedTruthForDayInput) => Promise<void> {
  if (cachedFn) return cachedFn;

  const requireFn = createRequire(__filename);
  const upCount = __dirname.includes(`${path.sep}dist${path.sep}`) ? 4 : 3;
  const ups = path.join(...Array.from({ length: upCount }, () => ".."));
  const bundlePath = path.join(__dirname, ups, "functions", "lib", "recomputeForDayExport.js");

  try {
    const mod = requireFn(bundlePath) as {
      recomputeDerivedTruthForDay: (input: RecomputeDerivedTruthForDayInput) => Promise<void>;
    };
    cachedFn = mod.recomputeDerivedTruthForDay;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(
      `Failed to load recompute bundle at ${bundlePath} (from ${__dirname}). Build @oli/functions first. Underlying: ${msg}`,
    );
  }

  return cachedFn!;
}
