/**
 * Quest / DirectLabs text-layer format detection (Phase 3D-A).
 * Does not treat every PDF containing "Quest" as supported.
 */

export type QuestFormatFamily =
  | "quest_text_pdf_v1"
  | "quest_directlabs_text_v1"
  | "quest_cardio_iq_text_v1";

export type QuestDetectionResult =
  | {
      supported: true;
      formatFamily: QuestFormatFamily;
      formatFamilyVersion: string;
      confidence: number;
      hasCardioIq: boolean;
    }
  | {
      supported: false;
      reasonCode:
        | "scanned_pdf_no_text"
        | "encrypted_pdf"
        | "unsupported_layout"
        | "low_confidence"
        | "unsupported_provider";
      confidence: number;
    };

const QUEST_SIGNATURES = [
  /quest\s+diagnostics/i,
  /directlabs/i,
  /performing\s+site:/i,
  /specimen:/i,
  /collected:/i,
  /reported:/i,
];

const CARDIO_IQ_SIGNATURES = [/cardio\s*iq/i, /cleveland\s+heartlab/i, /ldl[- ]?p\b/i];

const RESULT_TABLE_HINTS = [
  /reference\s+(range|interval)/i,
  /\bflag\b/i,
  /\bresult\b/i,
  /\bmg\/dL\b/i,
  /\bnmol\/L\b/i,
  /lipid\s+panel/i,
  /comprehensive\s+metabolic/i,
  /\bcbc\b/i,
];

/**
 * Detect supported Quest-family digitally generated report layouts from extracted text.
 */
export function detectQuestTextReport(args: {
  fullText: string;
  pageCount: number;
  textCharCount: number;
}): QuestDetectionResult {
  const text = args.fullText ?? "";
  if (args.textCharCount < 40 || text.trim().length < 40) {
    return { supported: false, reasonCode: "scanned_pdf_no_text", confidence: 0.9 };
  }

  if (/\/Encrypt\b|password[\s-]*protected|encrypted\s+pdf/i.test(text) && args.textCharCount < 200) {
    return { supported: false, reasonCode: "encrypted_pdf", confidence: 0.8 };
  }

  const signatureHits = QUEST_SIGNATURES.filter((re) => re.test(text)).length;
  const tableHits = RESULT_TABLE_HINTS.filter((re) => re.test(text)).length;
  const hasCardioIq = CARDIO_IQ_SIGNATURES.some((re) => re.test(text));

  if (signatureHits < 2 || tableHits < 1) {
    if (/quest/i.test(text) && signatureHits < 2) {
      return { supported: false, reasonCode: "unsupported_layout", confidence: 0.7 };
    }
    return { supported: false, reasonCode: "unsupported_provider", confidence: 0.75 };
  }

  const confidence = Math.min(0.99, 0.55 + signatureHits * 0.1 + tableHits * 0.08 + (hasCardioIq ? 0.05 : 0));
  if (confidence < 0.7) {
    return { supported: false, reasonCode: "low_confidence", confidence };
  }

  const isDirectLabs = /directlabs/i.test(text);
  const formatFamily: QuestFormatFamily = hasCardioIq
    ? "quest_cardio_iq_text_v1"
    : isDirectLabs
      ? "quest_directlabs_text_v1"
      : "quest_text_pdf_v1";

  return {
    supported: true,
    formatFamily,
    formatFamilyVersion: "1.0.0",
    confidence,
    hasCardioIq,
  };
}
