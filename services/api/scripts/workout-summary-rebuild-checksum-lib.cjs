/**
 * Pure helpers for workout-summary rebuild bundle checksum generation/verification.
 * Kept as CommonJS so Jest can require it without ESM loader config.
 *
 * Contract:
 * - Hash the on-disk bundle bytes as produced by esbuild (no semantic rewriting).
 * - Normalize only checksum *sidecar text* (trim, first token, lowercase hex, LF).
 * - Absolute paths must never enter the hashed payload (enforced by esbuild config + tests).
 */
"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const BUNDLE_NAME = "workoutDaySummaryRebuild.bundled.cjs";
const CHECKSUM_NAME = "workoutDaySummaryRebuild.bundled.cjs.sha256";

/**
 * @param {Buffer | Uint8Array | string} bytes
 * @returns {string} lowercase hex sha256
 */
function sha256Hex(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

/**
 * Parse a checksum sidecar line into a lowercase 64-char hex digest.
 * Accepts optional trailing filename (shasum style) and either LF or CRLF.
 * @param {string} text
 * @returns {string | null}
 */
function parseChecksumSidecarText(text) {
  const line = String(text).replace(/^\uFEFF/, "").trim();
  if (!line) return null;
  const hex = (line.split(/\s+/)[0] ?? "").toLowerCase();
  return /^[a-f0-9]{64}$/.test(hex) ? hex : null;
}

/**
 * Canonical sidecar file contents for a digest (always LF, no CRLF).
 * @param {string} hex
 * @returns {string}
 */
function formatChecksumSidecar(hex) {
  const normalized = parseChecksumSidecarText(hex);
  if (normalized == null) {
    throw new Error(`invalid checksum hex: ${JSON.stringify(hex)}`);
  }
  return `${normalized}\n`;
}

/**
 * @param {string} bundlePath
 * @returns {{ hex: string, byteLength: number }}
 */
function hashBundleFile(bundlePath) {
  const bytes = fs.readFileSync(bundlePath);
  return { hex: sha256Hex(bytes), byteLength: bytes.length };
}

/**
 * Write the tracked canonical checksum next to the on-disk bundle (explicit generation only).
 * @param {string} bundlePath
 * @param {string} checksumPath
 * @returns {{ hex: string, byteLength: number }}
 */
function writeCanonicalChecksumFromBundle(bundlePath, checksumPath) {
  if (!fs.existsSync(bundlePath)) {
    throw new Error(`missing bundle at ${bundlePath}`);
  }
  const { hex, byteLength } = hashBundleFile(bundlePath);
  fs.mkdirSync(path.dirname(checksumPath), { recursive: true });
  fs.writeFileSync(checksumPath, formatChecksumSidecar(hex), "utf8");
  return { hex, byteLength };
}

/**
 * Write a runtime sidecar next to a destination bundle (dist/), matching that file's bytes.
 * Does not touch the tracked src canonical checksum.
 * @param {string} bundlePath
 * @param {string} checksumPath
 * @returns {{ hex: string, byteLength: number }}
 */
function writeRuntimeChecksumBesideBundle(bundlePath, checksumPath) {
  return writeCanonicalChecksumFromBundle(bundlePath, checksumPath);
}

/**
 * @param {string} bundlePath
 * @param {string} checksumPath
 * @returns {{ ok: true, hex: string } | { ok: false, computed: string, expected: string }}
 */
function verifyBundleMatchesChecksumFile(bundlePath, checksumPath) {
  const expected = parseChecksumSidecarText(fs.readFileSync(checksumPath, "utf8"));
  if (expected == null) {
    throw new Error(`invalid checksum sidecar at ${checksumPath}`);
  }
  const { hex: computed } = hashBundleFile(bundlePath);
  if (computed !== expected) {
    return { ok: false, computed, expected };
  }
  return { ok: true, hex: computed };
}

/**
 * Fail if buffer text appears to embed absolute developer paths.
 * @param {Buffer} bytes
 * @returns {string[]}
 */
function findAbsolutePathLeaks(bytes) {
  const text = bytes.toString("utf8");
  const patterns = [
    /\/Users\/[^\s"'`]+/g,
    /\/home\/[^\s"'`]+/g,
    /[A-Za-z]:\\[^\s"'`]+/g,
    /file:\/\/\/[^\s"'`]+/g,
  ];
  /** @type {string[]} */
  const hits = [];
  for (const re of patterns) {
    const found = text.match(re);
    if (found) hits.push(...found.slice(0, 5));
  }
  return hits;
}

module.exports = {
  BUNDLE_NAME,
  CHECKSUM_NAME,
  sha256Hex,
  parseChecksumSidecarText,
  formatChecksumSidecar,
  hashBundleFile,
  writeCanonicalChecksumFromBundle,
  writeRuntimeChecksumBesideBundle,
  verifyBundleMatchesChecksumFile,
  findAbsolutePathLeaks,
};
