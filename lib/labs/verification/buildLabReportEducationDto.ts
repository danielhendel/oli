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
  const reportContent =
    (args.summary.reportContentCount ?? 0) +
    (args.summary.duplicateCount ?? 0) +
    (args.summary.historicalCount ?? 0);

  return {
    ok: true,
    documentId: args.documentId,
    title: "How Oli processed your report",
    sections: [
      {
        id: "auto_imported",
        title: "Results added to Labs",
        body: "Current lab results were safely imported from the report.",
        count: auto + verified,
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
        body:
          unsupported + withheld > 0
            ? "A small number of values could not be determined safely enough to add."
            : "No unresolved health results remained after processing.",
        count: unsupported + withheld,
      },
      {
        id: "unsupported",
        title: "Report notes preserved",
        body: "Reference tables, duplicates, historical columns, and laboratory guidance remain attached to the report and were not treated as new biomarkers.",
        count: reportContent,
      },
    ],
  };
}
