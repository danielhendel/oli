/**
 * B-3E-SIGNED-URL-TRANSPORT-SECURITY-01 — bounded signed URL download policy.
 * Synthetic hosts/URLs only. Never personal PDFs, paths, or real grant query strings.
 */

import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

import { DOCUMENT_MAX_BYTE_SIZE } from "@/lib/data/documents/documentValidation";
import {
  SIGNED_URL_DOWNLOAD_ALLOWED_HOSTS,
  SIGNED_URL_DOWNLOAD_TIMEOUT_MS,
  downloadSignedUrlArrayBuffer,
  evaluateSignedUrlDownloadPolicy,
  isAllowedSignedUrlDownloadHost,
} from "../signedUrlDownload";

const PDF_BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]); // %PDF-1.4

function approvedSignedUrl(path = "/oli-staging-fdbba.firebasestorage.app/users/u/documents/d/original"): string {
  return `https://storage.googleapis.com${path}?X-Goog-Algorithm=GOOG4-RSA-SHA256&X-Goog-Signature=abc`;
}

function mockResponse(init: {
  status?: number;
  ok?: boolean;
  type?: ResponseType;
  headers?: Record<string, string>;
  body?: ArrayBuffer | null;
  bodyFactory?: () => Promise<ArrayBuffer>;
  url?: string;
  redirected?: boolean;
}): Response {
  const status = init.status ?? 200;
  const headers = new Headers(init.headers ?? {});
  const body = init.body ?? PDF_BYTES.buffer;
  return {
    ok: init.ok ?? (status >= 200 && status < 300),
    status,
    type: init.type ?? "basic",
    headers,
    url: init.url ?? "",
    redirected: init.redirected ?? false,
    arrayBuffer: init.bodyFactory ?? (async () => body as ArrayBuffer),
  } as unknown as Response;
}

describe("signedUrlDownload allowlist", () => {
  it("allows only the exact GCS path-style host emitted by view-original", () => {
    expect(SIGNED_URL_DOWNLOAD_ALLOWED_HOSTS).toEqual(["storage.googleapis.com"]);
    expect(isAllowedSignedUrlDownloadHost("storage.googleapis.com")).toBe(true);
    expect(isAllowedSignedUrlDownloadHost("STORAGE.googleapis.com")).toBe(true);
  });

  it("rejects lookalike and arbitrary hosts", () => {
    expect(isAllowedSignedUrlDownloadHost("storage.googleapis.com.evil.test")).toBe(false);
    expect(isAllowedSignedUrlDownloadHost("evil-storage.googleapis.com")).toBe(false);
    expect(isAllowedSignedUrlDownloadHost("firebasestorage.googleapis.com")).toBe(false);
    expect(isAllowedSignedUrlDownloadHost("example.com")).toBe(false);
    expect(isAllowedSignedUrlDownloadHost("oli-staging-fdbba.firebasestorage.app")).toBe(false);
  });
});

describe("evaluateSignedUrlDownloadPolicy", () => {
  it("accepts an approved HTTPS GCS signed URL shape", () => {
    const result = evaluateSignedUrlDownloadPolicy(approvedSignedUrl());
    expect(result.ok).toBe(true);
  });

  it("rejects insecure and non-http(s) schemes", () => {
    const cases = [
      "http://storage.googleapis.com/b/o",
      "file:///tmp/x.pdf",
      "data:application/pdf;base64,JVBERi0=",
      "blob:https://storage.googleapis.com/x",
      "ftp://storage.googleapis.com/b/o",
      "ws://storage.googleapis.com/b/o",
      "javascript:alert(1)",
    ];
    for (const url of cases) {
      const result = evaluateSignedUrlDownloadPolicy(url);
      expect(result.ok).toBe(false);
      if (result.ok) continue;
      expect(result.reason).toBe("insecure_scheme");
    }
  });

  it("rejects malformed URLs without exposing the input", () => {
    const result = evaluateSignedUrlDownloadPolicy("not a url");
    expect(result).toEqual({ ok: false, reason: "invalid_url" });
    expect(JSON.stringify(result)).not.toContain("not a url");
  });

  it("rejects localhost and private destinations", () => {
    for (const url of [
      "https://localhost/o",
      "https://foo.localhost/o",
      "https://127.0.0.1/o",
      "https://10.1.2.3/o",
      "https://172.16.0.1/o",
      "https://192.168.1.1/o",
      "https://[::1]/o",
    ]) {
      const result = evaluateSignedUrlDownloadPolicy(url);
      expect(result.ok).toBe(false);
      if (result.ok) continue;
      expect(result.reason).toBe("host_not_allowed");
    }
  });

  it("rejects arbitrary public hosts even over HTTPS", () => {
    const result = evaluateSignedUrlDownloadPolicy("https://evil.example/report.pdf");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("host_not_allowed");
  });
});

describe("downloadSignedUrlArrayBuffer", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    jest.useFakeTimers({ advanceTimers: true });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("fetches an approved URL with omit credentials and no unsupported redirect mode", async () => {
    const response = mockResponse({
      type: "default" as ResponseType,
      url: approvedSignedUrl(),
      redirected: false,
    });
    globalThis.fetch = jest.fn(async () => response) as unknown as typeof fetch;

    const result = await downloadSignedUrlArrayBuffer(approvedSignedUrl());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.bytes.byteLength).toBe(PDF_BYTES.byteLength);

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const [, init] = (globalThis.fetch as jest.Mock).mock.calls[0]!;
    expect(init).toMatchObject({
      method: "GET",
      credentials: "omit",
    });
    expect(init).not.toHaveProperty("redirect");
    expect(init).toHaveProperty("signal");
  });

  it("rejects when native stack redirects off the allowlisted host", async () => {
    const response = mockResponse({
      status: 200,
      ok: true,
      type: "default" as ResponseType,
      url: "https://evil.example/stolen",
      redirected: true,
    });
    globalThis.fetch = jest.fn(async () => response) as unknown as typeof fetch;
    await expect(downloadSignedUrlArrayBuffer(approvedSignedUrl())).resolves.toEqual({
      ok: false,
      reason: "redirect_rejected",
    });
  });

  it("rejects residual 301/302/307/308 responses", async () => {
    for (const status of [301, 302, 307, 308]) {
      globalThis.fetch = jest.fn(async () =>
        mockResponse({ status, ok: false, type: "basic", url: approvedSignedUrl() }),
      ) as unknown as typeof fetch;
      const result = await downloadSignedUrlArrayBuffer(approvedSignedUrl());
      expect(result).toEqual({ ok: false, reason: "redirect_rejected" });
    }
  });

  it("rejects opaqueredirect responses", async () => {
    globalThis.fetch = jest.fn(async () =>
      mockResponse({ status: 0, ok: false, type: "opaqueredirect" }),
    ) as unknown as typeof fetch;
    await expect(downloadSignedUrlArrayBuffer(approvedSignedUrl())).resolves.toEqual({
      ok: false,
      reason: "redirect_rejected",
    });
  });

  it("rejects Content-Length above DOCUMENT_MAX_BYTE_SIZE before reading the body", async () => {
    let bodyRead = false;
    globalThis.fetch = jest.fn(async () =>
      mockResponse({
        headers: { "content-length": String(DOCUMENT_MAX_BYTE_SIZE + 1) },
        bodyFactory: async () => {
          bodyRead = true;
          return PDF_BYTES.buffer;
        },
      }),
    ) as unknown as typeof fetch;

    const result = await downloadSignedUrlArrayBuffer(approvedSignedUrl());
    expect(result).toEqual({ ok: false, reason: "content_too_large" });
    expect(bodyRead).toBe(false);
  });

  it("allows missing Content-Length then enforces actual byteLength", async () => {
    globalThis.fetch = jest.fn(async () =>
      mockResponse({ headers: {}, body: PDF_BYTES.buffer }),
    ) as unknown as typeof fetch;
    await expect(downloadSignedUrlArrayBuffer(approvedSignedUrl())).resolves.toMatchObject({
      ok: true,
    });

    const oversized = new ArrayBuffer(DOCUMENT_MAX_BYTE_SIZE + 1);
    globalThis.fetch = jest.fn(async () =>
      mockResponse({ headers: {}, body: oversized }),
    ) as unknown as typeof fetch;
    await expect(downloadSignedUrlArrayBuffer(approvedSignedUrl())).resolves.toEqual({
      ok: false,
      reason: "content_too_large",
    });
  });

  it("rejects malformed Content-Length safely", async () => {
    globalThis.fetch = jest.fn(async () =>
      mockResponse({ headers: { "content-length": "not-a-number" } }),
    ) as unknown as typeof fetch;
    await expect(downloadSignedUrlArrayBuffer(approvedSignedUrl())).resolves.toEqual({
      ok: false,
      reason: "http_failed",
    });
  });

  it("rejects empty bodies and non-2xx", async () => {
    globalThis.fetch = jest.fn(async () =>
      mockResponse({ body: new ArrayBuffer(0) }),
    ) as unknown as typeof fetch;
    await expect(downloadSignedUrlArrayBuffer(approvedSignedUrl())).resolves.toEqual({
      ok: false,
      reason: "empty_response",
    });

    globalThis.fetch = jest.fn(async () =>
      mockResponse({ status: 403, ok: false }),
    ) as unknown as typeof fetch;
    await expect(downloadSignedUrlArrayBuffer(approvedSignedUrl())).resolves.toEqual({
      ok: false,
      reason: "http_failed",
    });
  });

  it("aborts hung fetches with a safe timeout reason and clears the timer", async () => {
    globalThis.fetch = jest.fn(
      (_url: RequestInfo | URL, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            const err = new Error("Aborted");
            err.name = "AbortError";
            reject(err);
          });
        }),
    ) as unknown as typeof fetch;

    const pending = downloadSignedUrlArrayBuffer(approvedSignedUrl());
    await jest.advanceTimersByTimeAsync(SIGNED_URL_DOWNLOAD_TIMEOUT_MS);
    await expect(pending).resolves.toEqual({ ok: false, reason: "timeout" });
  });

  it("maps network failures without exposing exception text", async () => {
    globalThis.fetch = jest.fn(async () => {
      throw new Error("ECONNRESET secret-host.internal");
    }) as unknown as typeof fetch;
    const result = await downloadSignedUrlArrayBuffer(approvedSignedUrl());
    expect(result).toEqual({ ok: false, reason: "network_failed" });
    expect(JSON.stringify(result)).not.toContain("ECONNRESET");
    expect(JSON.stringify(result)).not.toContain("secret-host");
  });

  it("does not accept disallowed hosts even if fetch would succeed", async () => {
    const fetchMock = jest.fn(async () => mockResponse({}));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const result = await downloadSignedUrlArrayBuffer("https://evil.example/x.pdf");
    expect(result).toEqual({ ok: false, reason: "host_not_allowed" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("never returns the signed URL in success or failure payloads", async () => {
    globalThis.fetch = jest.fn(async () => mockResponse({})) as unknown as typeof fetch;
    const url = approvedSignedUrl();
    const ok = await downloadSignedUrlArrayBuffer(url);
    expect(JSON.stringify(ok)).not.toContain("X-Goog-Signature");
    expect(JSON.stringify(ok)).not.toContain("storage.googleapis.com");

    const bad = await downloadSignedUrlArrayBuffer("http://storage.googleapis.com/b/o?sig=1");
    expect(JSON.stringify(bad)).not.toContain("sig=1");
  });
});
