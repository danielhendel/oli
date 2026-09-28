/**
 * Binary ↔ base64 roundtrip + PDF magic helpers.
 * Synthetic bytes only — never personal PDFs or health content.
 */

import { describe, expect, it } from "@jest/globals";

import {
  arrayBufferToBase64,
  base64ToUint8Array,
  classifyBodyPrefix,
  compareContentLengthToByteLength,
  contentTypeToBucket,
  isPdfMagicBase64Head,
  isPdfMagicBytes,
} from "../binaryBase64";

describe("arrayBufferToBase64 roundtrip", () => {
  it("round-trips %PDF, null, high-bit, and 0xFF bytes byte-for-byte", () => {
    const original = new Uint8Array([
      0x25,
      0x50,
      0x44,
      0x46, // %PDF
      0x2d,
      0x31,
      0x2e,
      0x34,
      0x00, // null
      0x0a,
      0x80,
      0x9f,
      0xfe,
      0xff, // high-bit / 0xFF
      0x01,
      0x7f,
    ]);
    const b64 = arrayBufferToBase64(original.buffer);
    expect(b64.length).toBeGreaterThan(0);
    expect(b64).toMatch(/^[A-Za-z0-9+/]+=*$/);
    const decoded = base64ToUint8Array(b64);
    expect(Array.from(decoded)).toEqual(Array.from(original));
  });

  it("round-trips a multi-chunk buffer larger than the encode chunk size", () => {
    const original = new Uint8Array(0x5000);
    for (let i = 0; i < original.length; i += 1) {
      original[i] = (i * 17 + 3) & 0xff;
    }
    original[0] = 0x25;
    original[1] = 0x50;
    original[2] = 0x44;
    original[3] = 0x46;
    const decoded = base64ToUint8Array(arrayBufferToBase64(original.buffer));
    expect(decoded.byteLength).toBe(original.byteLength);
    expect(Array.from(decoded)).toEqual(Array.from(original));
  });
});

describe("PDF magic helpers", () => {
  it("accepts %PDF magic and rejects HTML/XML/JSON/empty/random", () => {
    expect(isPdfMagicBytes(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]))).toBe(true);
    expect(isPdfMagicBytes(new Uint8Array([0x3c, 0x68, 0x74, 0x6d, 0x6c]))).toBe(false); // <html
    expect(isPdfMagicBytes(new Uint8Array([0x3c, 0x3f, 0x78, 0x6d, 0x6c]))).toBe(false); // <?xml
    expect(isPdfMagicBytes(new Uint8Array([0x7b, 0x22, 0x61, 0x22]))).toBe(false); // {"a"
    expect(isPdfMagicBytes(new Uint8Array([]))).toBe(false);
    expect(isPdfMagicBytes(new Uint8Array([0x00, 0x01, 0x02, 0x03]))).toBe(false);

    // Base64 of exactly "%PDF"
    expect(isPdfMagicBase64Head("JVBERg==")).toBe(true);
    expect(isPdfMagicBase64Head("JVBERg==\n")).toBe(true); // native may insert newlines
    expect(isPdfMagicBase64Head(arrayBufferToBase64(new TextEncoder().encode("<html>").buffer))).toBe(
      false,
    );
  });

  it("classifies body prefixes by signature only", () => {
    expect(classifyBodyPrefix(new Uint8Array([0x25, 0x50, 0x44, 0x46]))).toBe("pdf");
    expect(classifyBodyPrefix(new TextEncoder().encode("<?xml version="))).toBe("xml");
    expect(classifyBodyPrefix(new TextEncoder().encode("<!DOCTYPE html>"))).toBe("html");
    expect(classifyBodyPrefix(new TextEncoder().encode('{"a":1}'))).toBe("json");
    expect(classifyBodyPrefix(new Uint8Array([0xff, 0xd8, 0xff]))).toBe("unknown_binary");
  });

  it("buckets content-type and content-length safely", () => {
    expect(contentTypeToBucket("application/pdf")).toBe("pdf");
    expect(contentTypeToBucket("application/pdf; charset=binary")).toBe("pdf");
    expect(contentTypeToBucket("application/octet-stream")).toBe("octet_stream");
    expect(contentTypeToBucket("text/html")).toBe("other");
    expect(contentTypeToBucket(null)).toBe("absent");

    expect(compareContentLengthToByteLength("128", 128)).toBe("match");
    expect(compareContentLengthToByteLength("128", 64)).toBe("mismatch");
    expect(compareContentLengthToByteLength(null, 128)).toBe("unavailable");
    expect(compareContentLengthToByteLength("abc", 128)).toBe("unavailable");
  });
});
