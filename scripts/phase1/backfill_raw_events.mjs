#!/usr/bin/env node
/**
 * Phase 1 Backfill Runner (JSONL)
 *
 * Input: JSON Lines file (one event per line), each line must be:
 * {
 *   "kind": "weight",
 *   "provider": "manual",
 *   "observedAt": "2025-01-01T12:00:00.000Z",
 *   "payload": { ... },
 *   "sourceId": "backfill"              // optional (defaults to "backfill")
 * }
 *
 * Env required:
 * - API_BASE_URL (e.g. http://localhost:8080)
 * - ID_TOKEN (Firebase ID token for the user)
 * - BACKFILL_FILE (path to .jsonl)
 *
 * Optional:
 * - DRY_RUN=1  (prints requests, does not call API)
 *
 * Deterministic idempotency:
 * - sha256("v1|kind|provider|observedAt|sourceId|stableJson(payload)")
 *
 * Run semantics (Step 5 style):
 * - Continue processing even if some lines fail
 * - Exit code is 1 if ANY line failed
 * - Summary printed at end
 */

import fs from "fs";
import crypto from "crypto";
import { setTimeout as sleep } from "timers/promises";

function reqEnv(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing env var: ${name}`);
    process.exit(1);
  }
  return v;
}

const API_BASE_URL = reqEnv("API_BASE_URL").replace(/\/+$/, "");
const ID_TOKEN = reqEnv("ID_TOKEN");
const BACKFILL_FILE = reqEnv("BACKFILL_FILE");
const DRY_RUN = process.env.DRY_RUN === "1";

function stableJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(stableJson).join(",") + "]";
  const keys = Object.keys(value).sort();
  return (
    "{" +
    keys
      .map((k) => JSON.stringify(k) + ":" + stableJson(value[k]))
      .join(",") +
    "}"
  );
}

function sha256Hex(s) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

function makeIdempotencyKey(evt) {
  const sourceId =
    typeof evt.sourceId === "string" && evt.sourceId.length ? evt.sourceId : "backfill";
  const payloadStable = stableJson(evt.payload ?? {});
  const seed = `v1|${evt.kind}|${evt.provider}|${evt.observedAt}|${sourceId}|${payloadStable}`;
  return sha256Hex(seed);
}

async function postIngest({ idempotencyKey, body }) {
  const url = `${API_BASE_URL}/ingest`;

  if (DRY_RUN) {
    console.log(`[DRY_RUN] POST ${url}`);
    console.log(`Idempotency-Key: ${idempotencyKey}`);
    console.log(JSON.stringify(body));
    return { ok: true, dryRun: true, rawEventId: "dry-run", idempotentReplay: false };
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ID_TOKEN}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();

  // Fail-closed: must be JSON
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON response (${res.status}): ${text.slice(0, 200)}`);
  }

  if (!res.ok || json?.ok !== true) {
    throw new Error(`Ingest failed (${res.status}): ${JSON.stringify(json)}`);
  }

  return json;
}

function validateLine(obj, lineNo) {
  const mustStr = (k) => typeof obj?.[k] === "string" && obj[k].length > 0;

  if (!mustStr("kind")) throw new Error(`Line ${lineNo}: missing/invalid "kind"`);
  if (!mustStr("provider")) throw new Error(`Line ${lineNo}: missing/invalid "provider"`);
  if (!mustStr("observedAt")) {
    throw new Error(`Line ${lineNo}: missing/invalid "observedAt" (ISO string)`);
  }

  // Basic ISO validation (fail-closed)
  const t = Date.parse(obj.observedAt);
  if (!Number.isFinite(t)) {
    throw new Error(`Line ${lineNo}: "observedAt" must be a valid ISO timestamp`);
  }

  if (typeof obj.payload !== "object" || obj.payload === null) {
    throw new Error(`Line ${lineNo}: "payload" must be an object`);
  }
}

async function main() {
  const raw = fs.readFileSync(BACKFILL_FILE, "utf8");
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);

  console.log(`Backfill file: ${BACKFILL_FILE}`);
  console.log(`Lines: ${lines.length}`);
  console.log(`Target: ${API_BASE_URL}/ingest`);
  if (DRY_RUN) console.log(`DRY_RUN=1 (no writes)`);

  let ok = 0;
  let replay = 0;
  let failed = 0;

  /** @type {{ lineNo: number; message: string }[]} */
  const errors = [];

  for (let i = 0; i < lines.length; i++) {
    const lineNo = i + 1;

    let evt;
    try {
      evt = JSON.parse(lines[i]);
    } catch {
      failed += 1;
      const msg = `Line ${lineNo}: invalid JSON`;
      errors.push({ lineNo, message: msg });
      process.stdout.write(`✖ line ${lineNo}/${lines.length} failed (invalid JSON)\n`);
      continue;
    }

    try {
      validateLine(evt, lineNo);
    } catch (e) {
      failed += 1;
      const msg = String(e instanceof Error ? e.message : e);
      errors.push({ lineNo, message: msg });
      process.stdout.write(`✖ line ${lineNo}/${lines.length} failed (validation)\n`);
      continue;
    }

    const sourceId =
      typeof evt.sourceId === "string" && evt.sourceId.length ? evt.sourceId : "backfill";
    const idempotencyKey = makeIdempotencyKey({ ...evt, sourceId });

    const body = {
      provider: evt.provider,
      kind: evt.kind,
      observedAt: evt.observedAt,
      sourceId,
      payload: evt.payload,
    };

    try {
      const resp = await postIngest({ idempotencyKey, body });
      ok += 1;
      if (resp?.idempotentReplay) replay += 1;

      process.stdout.write(
        `✔ line ${lineNo}/${lines.length} ok rawEventId=${resp.rawEventId}` +
          (resp.idempotentReplay ? " (replay)\n" : "\n"),
      );
    } catch (e) {
      failed += 1;
      const msg = String(e instanceof Error ? e.message : e);
      errors.push({ lineNo, message: msg });
      process.stdout.write(`✖ line ${lineNo}/${lines.length} failed\n`);
    }

    // tiny pacing to avoid bursting local/dev logs
    await sleep(20);
  }

  console.log(`Done. ok=${ok} replays=${replay} failed=${failed}`);

  if (failed > 0) {
    console.error(`\n❌ Backfill completed with ${failed} error(s). Showing up to first 20:\n`);
    for (const err of errors.slice(0, 20)) {
      console.error(`- ${err.message}`);
    }
    process.exit(1);
  }

  console.log("✅ Backfill completed successfully with zero errors.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
