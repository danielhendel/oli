/**
 * Overview peek uses two parallel single-kind raw-events requests (matches useWeightSeries query shape).
 */
import React, { useEffect, useRef } from "react";
import { act } from "react";
import renderer from "react-test-renderer";
import { useBodyOverviewPeek } from "../useBodyOverviewPeek";
import { getRawEvents } from "@/lib/api/usersMe";
import { useAuth } from "@/lib/auth/AuthProvider";
import { BODY_OVERVIEW_PEEK_PER_KIND_LIMIT } from "../overviewPeekConstants";

jest.mock("@/lib/api/usersMe", () => ({
  getRawEvents: jest.fn(),
}));

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: jest.fn(),
}));

const mockGetRawEvents = getRawEvents as jest.MockedFunction<typeof getRawEvents>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

function okList(items: unknown[]) {
  return {
    ok: true as const,
    status: 200,
    requestId: "r1",
    json: { items, nextCursor: null },
  };
}

function Harness({ onReady }: { onReady: (s: ReturnType<typeof useBodyOverviewPeek>) => void }) {
  const s = useBodyOverviewPeek();
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  useEffect(() => {
    if (s.status === "ready" || s.status === "error") onReadyRef.current(s);
  }, [s]);
  return null;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue({
    user: { uid: "u1" },
    initializing: false,
    getIdToken: jest.fn().mockResolvedValue("token"),
  } as unknown as ReturnType<typeof useAuth>);
});

describe("useBodyOverviewPeek", () => {
  it("calls getRawEvents twice with single kinds and merges rows", async () => {
    mockGetRawEvents
      .mockResolvedValueOnce(
        okList([
          {
            id: "w1",
            userId: "u1",
            sourceId: "apple_health",
            kind: "weight",
            observedAt: "2026-03-31T10:00:00.000Z",
            receivedAt: "2026-03-31T10:00:01.000Z",
            schemaVersion: 1,
            payload: { weightKg: 80 },
          },
        ]) as never,
      )
      .mockResolvedValueOnce(
        okList([
          {
            id: "c1",
            userId: "u1",
            sourceId: "apple_health",
            kind: "body_composition",
            observedAt: "2026-03-31T11:00:00.000Z",
            receivedAt: "2026-03-31T11:00:01.000Z",
            schemaVersion: 1,
            payload: { bmi: 22 },
          },
        ]) as never,
      );

    let last!: ReturnType<typeof useBodyOverviewPeek>;
    await act(async () => {
      renderer.create(
        <Harness
          onReady={(s) => {
            last = s;
          }}
        />,
      );
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockGetRawEvents).toHaveBeenCalledTimes(2);
    expect(mockGetRawEvents.mock.calls[0]?.[1]?.kinds).toEqual(["weight"]);
    expect(mockGetRawEvents.mock.calls[1]?.[1]?.kinds).toEqual(["body_composition"]);
    expect(mockGetRawEvents.mock.calls[0]?.[1]?.limit).toBe(BODY_OVERVIEW_PEEK_PER_KIND_LIMIT);
    expect(last.status).toBe("ready");
    if (last.status === "ready") {
      expect(last.items.map((i) => i.id).sort()).toEqual(["c1", "w1"]);
    }
  });

  it("stays ready when one kind fails but the other returns Apple Health rows", async () => {
    mockGetRawEvents
      .mockResolvedValueOnce(
        okList([
          {
            id: "w1",
            userId: "u1",
            sourceId: "apple_health",
            kind: "weight",
            observedAt: "2026-03-31T10:00:00.000Z",
            receivedAt: "2026-03-31T10:00:01.000Z",
            schemaVersion: 1,
            payload: { weightKg: 80 },
          },
        ]) as never,
      )
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        kind: "http",
        error: "HTTP 400",
        requestId: "bad",
      } as never);

    let last!: ReturnType<typeof useBodyOverviewPeek>;
    await act(async () => {
      renderer.create(<Harness onReady={(s) => (last = s)} />);
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(last.status).toBe("ready");
    if (last.status === "ready") {
      expect(last.items).toHaveLength(1);
      expect(last.items[0]?.id).toBe("w1");
    }
  });

  it("errors only when both parallel requests fail", async () => {
    mockGetRawEvents
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        kind: "http",
        error: "HTTP 400",
        requestId: "a",
      } as never)
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        kind: "http",
        error: "HTTP 400",
        requestId: "b",
      } as never);

    let last!: ReturnType<typeof useBodyOverviewPeek>;
    await act(async () => {
      renderer.create(<Harness onReady={(s) => (last = s)} />);
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(last.status).toBe("error");
    if (last.status === "error") {
      expect(last.requestId).toBe("a");
    }
  });
});
