/**
 * Consumer-facing copy for Labs extraction warning codes.
 * Never expose internal parser codes directly in UI.
 */

import type { LabExtractionWarningCode } from "@oli/contracts";

const WARNING_COPY: Record<LabExtractionWarningCode, string> = {
  unsupported_layout: "This report layout isn’t fully supported yet.",
  scanned_pdf_no_text: "This PDF doesn’t include a readable text layer.",
  encrypted_pdf: "This PDF appears protected and couldn’t be read.",
  partial_page_text: "Some pages had incomplete text.",
  ambiguous_analyte: "An analyte name needs your review.",
  ambiguous_value: "A result value needs your review.",
  ambiguous_unit: "A unit needs your review.",
  ambiguous_reference_range: "A reference range needs your review.",
  ambiguous_flag: "A laboratory flag needs your review.",
  duplicate_candidate: "A possible duplicate or historical column was skipped.",
  conflicting_report_date: "Report dates may conflict — please confirm.",
  unsupported_result_type: "A result type isn’t supported yet.",
  page_count_mismatch: "Page count didn’t match expectations.",
  low_confidence: "Some extracted values need confirmation.",
  method_note_unresolved: "A method note couldn’t be linked automatically.",
};

export function labWarningConsumerMessage(code: LabExtractionWarningCode): string {
  return WARNING_COPY[code] ?? "This extraction needs your review.";
}
