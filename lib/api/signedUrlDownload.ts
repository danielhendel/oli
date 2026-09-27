/**
 * Short-lived signed URL byte download (View Original materialization).
 *
 * Not an Oli API Gateway call — the URL is already owner-scoped and time-bounded by the
 * grant endpoint. Lives beside http.ts so the client trust boundary still funnels all
 * network I/O through lib/api/*. Never logs, stores, or returns the URL itself.
 */

export async function downloadSignedUrlArrayBuffer(
  url: string,
): Promise<
  | { ok: true; buffer: ArrayBuffer }
  | { ok: false; reason: "http_failed" | "empty" | "network" }
> {
  try {
    const response = await fetch(url);
    if (!response.ok) return { ok: false, reason: "http_failed" };
    const buffer = await response.arrayBuffer();
    if (!buffer || buffer.byteLength < 5) return { ok: false, reason: "empty" };
    return { ok: true, buffer };
  } catch {
    return { ok: false, reason: "network" };
  }
}
