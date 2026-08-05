import {
  __testing_resetLabsDerivedInvalidate,
  invalidateLabsDerivedViews,
  subscribeLabsDerivedInvalidate,
} from "../labsDerivedInvalidate";

describe("labsDerivedInvalidate", () => {
  beforeEach(() => {
    __testing_resetLabsDerivedInvalidate();
  });

  it("notifies subscribers on reprocess so Labs views can refetch without restart", () => {
    const seen: string[] = [];
    const unsub = subscribeLabsDerivedInvalidate((p) => {
      seen.push(p.reason);
    });
    invalidateLabsDerivedViews({ reason: "reprocess", documentId: "doc1" });
    expect(seen).toEqual(["reprocess"]);
    unsub();
    invalidateLabsDerivedViews({ reason: "manual" });
    expect(seen).toEqual(["reprocess"]);
  });
});
