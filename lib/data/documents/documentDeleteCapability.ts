/**
 * Consumer delete capability for Document OS + bridged legacy Labs uploads.
 * Never exposes storage paths, collection names, or internal legacy IDs.
 */

import type { DocumentRecordStatus } from "@oli/contracts";

export type DocumentOwnershipKind = "document_os" | "legacy_lab";

export type DocumentDeleteCapability =
  | {
      canDelete: true;
      ownershipKind: DocumentOwnershipKind;
    }
  | {
      canDelete: false;
      reason: "deletion_not_supported" | "record_incomplete" | "already_deleted";
    };

export const DOCUMENT_DELETE_ACTION_LABEL = "Delete document" as const;

export type DocumentDeleteActionView = {
  canDelete: boolean;
  actionLabel: typeof DOCUMENT_DELETE_ACTION_LABEL;
  ownershipKind: DocumentOwnershipKind | null;
};

/**
 * Resolve delete capability from safe consumer DTO fields only.
 * API is source of truth for canDelete; ownershipKind is presentation-only.
 */
export function resolveDocumentDeleteCapability(args: {
  canDelete: boolean;
  legacySource: "document" | "lab_upload" | null | undefined;
  status: DocumentRecordStatus;
}): DocumentDeleteCapability {
  if (args.status === "uploading") {
    return { canDelete: false, reason: "record_incomplete" };
  }
  if (!args.canDelete) {
    return { canDelete: false, reason: "deletion_not_supported" };
  }
  const ownershipKind: DocumentOwnershipKind =
    args.legacySource === "lab_upload" ? "legacy_lab" : "document_os";
  return { canDelete: true, ownershipKind };
}

export function documentDeleteActionView(capability: DocumentDeleteCapability): DocumentDeleteActionView {
  if (!capability.canDelete) {
    return {
      canDelete: false,
      actionLabel: DOCUMENT_DELETE_ACTION_LABEL,
      ownershipKind: null,
    };
  }
  return {
    canDelete: true,
    actionLabel: DOCUMENT_DELETE_ACTION_LABEL,
    ownershipKind: capability.ownershipKind,
  };
}
