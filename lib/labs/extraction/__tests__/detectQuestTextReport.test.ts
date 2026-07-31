import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "@jest/globals";
import { detectQuestTextReport } from "../detectQuestTextReport";

function loadFixture(name: string): string {
  return readFileSync(path.join(__dirname, "..", "__fixtures__", `${name}.txt`), "utf8");
}

function detect(name: string) {
  const text = loadFixture(name);
  const textCharCount = text.replace(/\s+/g, " ").trim().length;
  return detectQuestTextReport({ fullText: text, pageCount: 1, textCharCount });
}

describe("detectQuestTextReport", () => {
  it("detects the comprehensive Quest fixture and identifies the Cardio IQ family", () => {
    const result = detect("quest_comprehensive_v1");
    expect(result.supported).toBe(true);
    if (!result.supported) return;
    expect(result.formatFamily).toBe("quest_cardio_iq_text_v1");
    expect(result.hasCardioIq).toBe(true);
    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
  });

  it("detects the mixed-types Quest fixture as the base text PDF family", () => {
    const result = detect("quest_mixed_types_v1");
    expect(result.supported).toBe(true);
    if (!result.supported) return;
    expect(result.formatFamily).toBe("quest_text_pdf_v1");
    expect(result.hasCardioIq).toBe(false);
  });

  it("marks a report lacking Quest signatures/result tables as unsupported", () => {
    const result = detect("unsupported_provider");
    expect(result.supported).toBe(false);
    if (result.supported) return;
    expect(result.reasonCode).toBe("unsupported_layout");
  });

  it("marks a scanned/near-empty document as unsupported rather than guessing a layout", () => {
    const result = detect("image_only_stub");
    expect(result.supported).toBe(false);
  });

  it("treats near-empty text (under the char-count floor) as scanned_pdf_no_text", () => {
    const result = detectQuestTextReport({ fullText: "short", pageCount: 1, textCharCount: 5 });
    expect(result.supported).toBe(false);
    if (result.supported) return;
    expect(result.reasonCode).toBe("scanned_pdf_no_text");
  });

  it("never marks a document supported without at least two Quest signature hits", () => {
    const text = "Quest Diagnostics\nSome unrelated report body text that is long enough to pass the floor.";
    const result = detectQuestTextReport({ fullText: text, pageCount: 1, textCharCount: text.length });
    expect(result.supported).toBe(false);
  });
});
