/**
 * Load report collection/received/reported dates from the latest extraction draft.
 */

import { userCollection } from "../../db";

export type LabReportDates = {
  collectedAt: string | null;
  receivedAt: string | null;
  reportedAt: string | null;
};

const EMPTY: LabReportDates = { collectedAt: null, receivedAt: null, reportedAt: null };

export async function loadLabReportDates(uid: string, documentId: string): Promise<LabReportDates> {
  const snap = await userCollection(uid, "labExtractionDrafts")
    .where("documentId", "==", documentId)
    .limit(1)
    .get();
  if (snap.empty) return EMPTY;
  const raw = snap.docs[0]!.data() as {
    reportCandidate?: {
      collectedAt?: string | null;
      receivedAt?: string | null;
      reportedAt?: string | null;
    };
  };
  return {
    collectedAt: raw.reportCandidate?.collectedAt ?? null,
    receivedAt: raw.reportCandidate?.receivedAt ?? null,
    reportedAt: raw.reportCandidate?.reportedAt ?? null,
  };
}
