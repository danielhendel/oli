#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Sprint 4 — Client Firestore Lockdown
 *
 * This is a CI tripwire independent of ESLint.
 *
 * Constitution:
 * - Firestore must be SERVER-ONLY.
 * - Client code (app/, lib/) must never import any Firestore module
 *   (firebase/firestore, firebase/firestore/lite, @firebase/firestore, etc.)
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const TARGET_DIRS = ["app", "lib"];

const IGNORE_DIRS = new Set([
  "node_modules",
  ".git",
  ".expo",
  "dist",
  "build",
  "coverage",
  "dist-types",
  "__tests__",
]);

const SOURCE_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);

const FORBIDDEN = ["firebase/firestore", "firebase/firestore/lite", "@firebase/firestore"];
const FORBIDDEN_PREFIXES = ["firebase/firestore/", "@firebase/firestore/"];

function fail(msg) {
  console.error(`\n❌ Client Firestore Lockdown failed:\n${msg}\n`);
  process.exit(1);
}

function exists(p) {
  return fs.existsSync(p);
}

function walk(dir) {
  const out = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (IGNORE_DIRS.has(e.name)) continue;
      out.push(...walk(full));
    } else {
      const ext = path.extname(e.name).toLowerCase();
      if (!SOURCE_EXTS.has(ext)) continue;
      out.push(full);
    }
  }
  return out;
}

function rel(p) {
  return path.relative(ROOT, p);
}

function hasForbiddenImport(text) {
  for (const s of FORBIDDEN) {
    if (text.includes(s)) return s;
  }
  for (const prefix of FORBIDDEN_PREFIXES) {
    if (text.includes(prefix)) return prefix + "…";
  }
  return null;
}

const offenders = [];

for (const d of TARGET_DIRS) {
  const dir = path.join(ROOT, d);
  if (!exists(dir)) continue;

  const files = walk(dir);
  for (const f of files) {
    const text = fs.readFileSync(f, "utf8");
    const hit = hasForbiddenImport(text);
    if (hit) offenders.push({ file: rel(f), hit });
  }
}

if (offenders.length) {
  fail(
    offenders.map((o) => `- ${o.file} (matched: ${o.hit})`).join("\n") +
      "\n\nFix: remove Firestore usage from client. Use the Cloud Run API boundary (lib/api/*) instead."
  );
}

console.log("✅ Client Firestore Lockdown passed: no Firestore imports detected in app/ or lib/.");
