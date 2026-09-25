/**
 * DEV-only synthetic Body Scan PDF fixture for physical cache-lifecycle testing.
 *
 * Contains only approved non-health text. No patient identity, metrics, provider,
 * or content derived from a real DXA report.
 */

export const SYNTHETIC_BODY_SCAN_CACHE_PDF_LINES = [
  "Oli Synthetic Body Scan Cache Test",
  "Development fixture - no personal health information",
  "Safe to delete",
] as const;

/** Stable harness document id — never shown in DEV status UI. */
export const SYNTHETIC_BODY_SCAN_CACHE_DOCUMENT_ID = "synth_cache_harness" as const;

/**
 * Deterministic minimal PDF-1.1 bytes (one page, Helvetica text).
 * Built from approved synthetic lines only.
 */
export function buildSyntheticBodyScanCachePdfBytes(): Uint8Array {
  const textOps = SYNTHETIC_BODY_SCAN_CACHE_PDF_LINES.map((line, index) => {
    const y = 720 - index * 28;
    const escaped = line.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
    return `BT /F1 14 Tf 72 ${y} Td (${escaped}) Tj ET`;
  }).join("\n");

  const stream = `${textOps}\n`;
  const streamLength = stream.length;

  const objects: string[] = [
    "1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n",
    "2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n",
    "3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources<< /Font<< /F1 5 0 R >> >> >>endobj\n",
    `4 0 obj<< /Length ${streamLength} >>stream\n${stream}endstream\nendobj\n`,
    "5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n",
  ];

  let body = "%PDF-1.1\n";
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(body.length);
    body += obj;
  }
  const xrefStart = body.length;
  let xref = `xref\n0 ${objects.length + 1}\n`;
  xref += "0000000000 65535 f \n";
  for (let i = 1; i <= objects.length; i += 1) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  const trailer =
    `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\n` +
    `startxref\n${xrefStart}\n%%EOF\n`;
  const pdf = body + xref + trailer;
  const out = new Uint8Array(pdf.length);
  for (let i = 0; i < pdf.length; i += 1) {
    out[i] = pdf.charCodeAt(i) & 0xff;
  }
  return out;
}

/** Invalid bytes that must fail local `%PDF` verification. */
export function buildInvalidSyntheticBodyScanCacheBytes(): Uint8Array {
  const text = "NOT_A_PDF_oli_synthetic_cache_test";
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i += 1) {
    out[i] = text.charCodeAt(i) & 0xff;
  }
  return out;
}

export function uint8ToBase64(bytes: Uint8Array): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let result = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i]!;
    const b = i + 1 < bytes.length ? bytes[i + 1]! : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2]! : 0;
    const triple = (a << 16) | (b << 8) | c;
    result += chars[(triple >> 18) & 63];
    result += chars[(triple >> 12) & 63];
    result += i + 1 < bytes.length ? chars[(triple >> 6) & 63] : "=";
    result += i + 2 < bytes.length ? chars[triple & 63] : "=";
  }
  return result;
}

export function syntheticBodyScanCachePdfContainsOnlyApprovedText(pdfLatin1: string): boolean {
  if (!pdfLatin1.startsWith("%PDF")) return false;
  for (const line of SYNTHETIC_BODY_SCAN_CACHE_PDF_LINES) {
    if (!pdfLatin1.includes(line)) return false;
  }
  const forbidden = [
    /\bDOB\b/i,
    /\bPatient\b/i,
    /Live Lean/i,
    /162\.2/,
    /20\.9%/,
    /122\.1/,
    /Skeletal Muscle/i,
    /osteopor/i,
  ];
  return !forbidden.some((re) => re.test(pdfLatin1));
}
