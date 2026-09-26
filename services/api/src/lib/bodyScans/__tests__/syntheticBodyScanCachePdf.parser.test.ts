/**
 * Parser-level validation of the DEV synthetic Body Scan cache PDF.
 * Spawns Node to load pdfjs-dist (ESM) — the approved server PDF dependency —
 * because Jest cannot dynamic-import the ESM pdfjs build without vm-modules.
 * Never uses personal DXA bytes.
 */

import { execFileSync } from "node:child_process";
import path from "node:path";

import {
  SYNTHETIC_BODY_SCAN_CACHE_PDF_LINES,
  buildSyntheticBodyScanCachePdfBytes,
  syntheticBodyScanCachePdfContainsOnlyApprovedText,
} from "../../../../../../lib/data/body-scans/syntheticBodyScanCachePdf";

describe("syntheticBodyScanCachePdf parser validity", () => {
  it("opens with pdfjs, one page, approved synthetic text only", () => {
    const bytes = buildSyntheticBodyScanCachePdfBytes();
    expect(bytes.byteLength).toBeGreaterThan(0);
    expect(String.fromCharCode(bytes[0]!, bytes[1]!, bytes[2]!, bytes[3]!)).toBe("%PDF");

    const latin1 = String.fromCharCode(...bytes);
    expect(syntheticBodyScanCachePdfContainsOnlyApprovedText(latin1)).toBe(true);

    const apiRoot = path.resolve(__dirname, "../../../../../");
    const b64 = Buffer.from(bytes).toString("base64");
    const expectedJson = JSON.stringify([...SYNTHETIC_BODY_SCAN_CACHE_PDF_LINES]);
    const script = `
import { createRequire } from "module";
const require = createRequire(${JSON.stringify(path.join(apiRoot, "package.json"))});
const pdfjsPath = require.resolve("pdfjs-dist/legacy/build/pdf.mjs");
const pdfjs = await import(pdfjsPath);
const bytes = Buffer.from(${JSON.stringify(b64)}, "base64");
const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes), useSystemFonts: true }).promise;
if (doc.numPages !== 1) { console.error("pages", doc.numPages); process.exit(2); }
const page = await doc.getPage(1);
const content = await page.getTextContent();
const text = content.items.map((i) => ("str" in i ? i.str : "")).join(" ");
await doc.destroy();
const expected = ${expectedJson};
for (const line of expected) {
  if (!text.includes(line)) { console.error("missing", line); process.exit(3); }
}
if (/\\bDOB\\b/i.test(text) || /\\bPatient\\b/i.test(text) || /Live Lean/i.test(text) || text.includes("162.2") || text.includes("20.9%") || /Skeletal Muscle/i.test(text) || /osteopor/i.test(text)) {
  console.error("forbidden");
  process.exit(4);
}
console.log("PARSER_OK");
`;
    const out = execFileSync(process.execPath, ["--input-type=module", "-e", script], {
      encoding: "utf8",
      cwd: apiRoot,
      env: process.env,
    });
    expect(out).toContain("PARSER_OK");
  });
});
