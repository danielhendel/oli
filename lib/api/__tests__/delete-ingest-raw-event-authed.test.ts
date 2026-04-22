import { deleteIngestedRawEventAuthed } from "@/lib/api/ingest";
import { apiDeleteJsonAuthed } from "@/lib/api/http";

jest.mock("@/lib/api/http", () => ({
  apiDeleteJsonAuthed: jest.fn(),
}));

const mockApiDeleteJsonAuthed = jest.mocked(apiDeleteJsonAuthed);

describe("deleteIngestedRawEventAuthed", () => {
  beforeEach(() => {
    mockApiDeleteJsonAuthed.mockReset();
  });

  it("treats HTTP 200 with full JSON body as success", async () => {
    mockApiDeleteJsonAuthed.mockResolvedValue({
      ok: true,
      status: 200,
      requestId: "hdr-rid",
      json: {
        ok: true,
        rawEventId: "w1",
        requestId: "body-rid",
        suppressionWritten: false,
      },
    });

    const out = await deleteIngestedRawEventAuthed("w1", "tok");
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.status).toBe(200);
    expect(out.data).toEqual({
      ok: true,
      rawEventId: "w1",
      requestId: "body-rid",
      suppressionWritten: false,
    });
  });

  it("treats HTTP 200 with omitted body requestId as success (header fallback)", async () => {
    mockApiDeleteJsonAuthed.mockResolvedValue({
      ok: true,
      status: 200,
      requestId: "from-header",
      json: {
        ok: true,
        rawEventId: "w1",
        suppressionWritten: true,
      },
    });

    const out = await deleteIngestedRawEventAuthed("w1", "tok");
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.status).toBe(200);
    expect(out.data.requestId).toBe("from-header");
    expect(out.data.suppressionWritten).toBe(true);
  });

  it("treats HTTP 200 with empty JSON body as success using path id + header requestId", async () => {
    mockApiDeleteJsonAuthed.mockResolvedValue({
      ok: true,
      status: 200,
      requestId: "rid-empty-body",
      json: null,
    });

    const out = await deleteIngestedRawEventAuthed("w9", "tok");
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.data).toEqual({
      ok: true,
      rawEventId: "w9",
      requestId: "rid-empty-body",
      suppressionWritten: false,
    });
  });

  it("treats HTTP 404 with NOT_FOUND body as success (already deleted)", async () => {
    mockApiDeleteJsonAuthed.mockResolvedValue({
      ok: false,
      status: 404,
      kind: "http",
      error: "HTTP 404",
      requestId: "rid-404",
      json: {
        ok: false,
        error: { code: "NOT_FOUND", message: "Workout record not found" },
        requestId: "rid-404",
        suppressionWritten: true,
      },
    });

    const out = await deleteIngestedRawEventAuthed("appleHealth:v2:workout:x", "tok");
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.status).toBe(404);
    expect(out.data.ok).toBe(true);
    expect(out.data.rawEventId).toBe("appleHealth:v2:workout:x");
    expect(out.data.suppressionWritten).toBe(true);
  });
});
