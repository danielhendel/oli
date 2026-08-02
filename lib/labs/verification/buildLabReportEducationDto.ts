/**
 * Consumer education DTO builder for report processing (no internal codes).
 */
import type { LabImportSummaryDto, LabReportEducationDto } from "@oli/contracts";

export function buildLabReportEducationDto(args: {
  documentId: string;
  summary: LabImportSummaryDto;
}): LabReportEducationDto {
  const auto = args.summary.autoImportedCount ?? args.summary.importedCount;
  const verified = args.summary.systemVerifiedCount ?? 0;
  const withheld = args.summary.withheldCount ?? 0;
  const unsupported = args.summary.unsupportedCount ?? args.summary.unmatchedCount;

  return {
    ok: true,
    documentId: args.documentId,
    title: "How Oli processed your report",
    sections: [
      {
        id: "auto_imported",
        title: "Imported automatically",
        body: "Report structure, analyte, value, unit, date, and source were clear.",
        count: auto,
      },
      {
        id: "system_verified",
        title: "Verified by Oli",
        body: "An additional transcription check was required before the result was added.",
        count: verified,
      },
      {
        id: "withheld",
        title: "Not added",
        body: "The result remains preserved in the original report, but Oli could not determine its structure safely enough to add it.",
        count: withheld,
      },
      {
        id: "unsupported",
        title: "Not yet supported",
        body: "These results are outside the current supported catalog or report layout.",
        count: unsupported,
      },
    ],
  };
}
