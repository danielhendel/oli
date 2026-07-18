import { fetchTimelineDayEventsPages } from "@/lib/features/timeline/fetchTimelineDayEventsPages";
import { fetchTimelineDayRawEventsPages } from "@/lib/features/timeline/fetchTimelineDayRawEventsPages";
import {
  TIMELINE_DAY_EVENTS_PAGE_SIZE,
  TIMELINE_DAY_MAX_PAGES_PER_FAMILY,
  TIMELINE_DAY_RAW_EVENTS_PAGE_SIZE,
} from "@/lib/features/timeline/timelineDayPageLimits";

const mockGetEvents = jest.fn();
const mockGetRawEvents = jest.fn();

jest.mock("@/lib/api/usersMe", () => ({
  getEvents: (...args: unknown[]) => mockGetEvents(...args),
  getRawEvents: (...args: unknown[]) => mockGetRawEvents(...args),
}));

describe("fetchTimelineDayEventsPages", () => {
  beforeEach(() => {
    mockGetEvents.mockReset();
  });

  test("exact-day query retained and pages follow until null", async () => {
    mockGetEvents
      .mockResolvedValueOnce({
        ok: true,
        json: { items: [{ id: "e1" }], nextCursor: "c1" },
      })
      .mockResolvedValueOnce({
        ok: true,
        json: { items: [{ id: "e2" }], nextCursor: null },
      });

    const result = await fetchTimelineDayEventsPages({
      day: "2026-07-16",
      idToken: "tok",
    });

    expect(result.completeness).toBe("complete");
    expect(result.items.map((i) => i.id)).toEqual(["e1", "e2"]);
    expect(mockGetEvents.mock.calls[0][1]).toMatchObject({
      start: "2026-07-16T00:00:00.000Z",
      end: "2026-07-16T23:59:59.999Z",
      limit: TIMELINE_DAY_EVENTS_PAGE_SIZE,
    });
    expect(mockGetEvents.mock.calls[0][1].cursor).toBeUndefined();
    expect(mockGetEvents.mock.calls[1][1].cursor).toBe("c1");
    expect(mockGetEvents.mock.calls[0][1].start.slice(0, 10)).toBe("2026-07-16");
    expect(mockGetEvents.mock.calls[0][1].end.slice(0, 10)).toBe("2026-07-16");
  });

  test("page cap enforced; never ready-complete with remaining cursor", async () => {
    for (let i = 0; i < TIMELINE_DAY_MAX_PAGES_PER_FAMILY; i++) {
      mockGetEvents.mockResolvedValueOnce({
        ok: true,
        json: { items: [{ id: `e${i}` }], nextCursor: `c${i}` },
      });
    }
    const result = await fetchTimelineDayEventsPages({
      day: "2026-07-16",
      idToken: "tok",
    });
    expect(result.completeness).toBe("partial");
    if (result.completeness === "partial") {
      expect(result.reason).toBe("page_cap");
    }
    expect(mockGetEvents).toHaveBeenCalledTimes(TIMELINE_DAY_MAX_PAGES_PER_FAMILY);
  });

  test("dedupe stable ids across pages", async () => {
    mockGetEvents
      .mockResolvedValueOnce({
        ok: true,
        json: { items: [{ id: "same" }], nextCursor: "c1" },
      })
      .mockResolvedValueOnce({
        ok: true,
        json: { items: [{ id: "same" }, { id: "other" }], nextCursor: null },
      });
    const result = await fetchTimelineDayEventsPages({
      day: "2026-07-16",
      idToken: "tok",
    });
    expect(result.items.map((i) => i.id)).toEqual(["same", "other"]);
  });
});

describe("fetchTimelineDayRawEventsPages", () => {
  beforeEach(() => {
    mockGetRawEvents.mockReset();
  });

  test("allowed kinds + includePayload + day bounds retained", async () => {
    mockGetRawEvents.mockResolvedValueOnce({
      ok: true,
      json: {
        items: [{ id: "r1", payload: { food: "secret" } }],
        nextCursor: null,
      },
    });
    const result = await fetchTimelineDayRawEventsPages({
      day: "2026-07-16",
      idToken: "tok",
    });
    expect(result.completeness).toBe("complete");
    expect(mockGetRawEvents.mock.calls[0][1]).toMatchObject({
      start: "2026-07-16",
      end: "2026-07-16",
      kinds: ["nutrition", "incomplete"],
      includePayload: true,
      limit: TIMELINE_DAY_RAW_EVENTS_PAGE_SIZE,
    });
    // Loader retains items for VM normalization; presentation must strip payload later.
    expect(result.items[0]?.id).toBe("r1");
  });

  test("complete only after cursor exhausted", async () => {
    mockGetRawEvents
      .mockResolvedValueOnce({
        ok: true,
        json: { items: [{ id: "r1" }], nextCursor: "c1" },
      })
      .mockResolvedValueOnce({
        ok: true,
        json: { items: [{ id: "r2" }], nextCursor: null },
      });
    const result = await fetchTimelineDayRawEventsPages({
      day: "2026-07-16",
      idToken: "tok",
    });
    expect(result.completeness).toBe("complete");
    expect(result.pageCount).toBe(2);
  });
});
