import { describe, expect, it, beforeEach } from "@jest/globals";
import {
  __testing_resetDocumentListInvalidate,
  filterOutDeletedDocuments,
  isDocumentDeletedLocally,
  isDocumentDetailCleared,
  markDocumentDeleted,
  subscribeDocumentDeleted,
} from "../documentListInvalidate";

describe("documentListInvalidate", () => {
  beforeEach(() => {
    __testing_resetDocumentListInvalidate();
  });

  it("marks deleted ids and notifies subscribers", () => {
    const seen: string[] = [];
    const unsub = subscribeDocumentDeleted(({ documentId }) => {
      seen.push(documentId);
    });
    markDocumentDeleted("doc_a");
    expect(isDocumentDeletedLocally("doc_a")).toBe(true);
    expect(isDocumentDetailCleared("doc_a")).toBe(true);
    expect(seen).toEqual(["doc_a"]);
    unsub();
  });

  it("removes deleted item from list pages immediately", () => {
    const before = [
      { id: "doc_keep", filename: "Keep.pdf" },
      { id: "doc_gone", filename: "Gone.pdf" },
      { id: "lab:legacy", filename: "DirectLabs.pdf" },
    ];
    markDocumentDeleted("doc_gone");
    expect(filterOutDeletedDocuments(before).map((i) => i.id)).toEqual(["doc_keep", "lab:legacy"]);
  });

  it("prevents stale responses from restoring a deleted row", () => {
    markDocumentDeleted("doc_gone");
    const staleServerPage = [
      { id: "doc_keep", filename: "Keep.pdf" },
      { id: "doc_gone", filename: "Gone.pdf" },
      { id: "lab:direct", filename: "DirectLabs.pdf" },
    ];
    expect(filterOutDeletedDocuments(staleServerPage).map((i) => i.id)).toEqual([
      "doc_keep",
      "lab:direct",
    ]);
  });

  it("does not remove DirectLabs legacy id when another document is deleted", () => {
    markDocumentDeleted("doc_new_upload");
    const items = filterOutDeletedDocuments([
      { id: "lab:upload_direct", filename: "DirectLabs.pdf" },
      { id: "doc_new_upload", filename: "DirectLabs.pdf" },
    ]);
    expect(items).toEqual([{ id: "lab:upload_direct", filename: "DirectLabs.pdf" }]);
  });
});
