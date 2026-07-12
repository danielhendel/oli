/**
 * Oura raw-event write: core (sleep/hrv/steps/workout) awaited; ouraRawItems deferred.
 */
import { writeOuraRawEvents } from "../ouraIngestWrite";
import { userCollection } from "../../db";
import { logger } from "../logger";
import { assertOuraTelemetryPrivacy } from "../testSupport/assertOuraTelemetryPrivacy";

jest.mock("../../db", () => ({
  userCollection: jest.fn(),
}));

jest.mock("../writeFailure", () => ({
  writeFailure: jest.fn().mockResolvedValue({ id: "fail_1" }),
}));

const mockCreate = jest.fn().mockResolvedValue(undefined);
const mockGet = jest.fn().mockResolvedValue({ exists: false });
const mockSet = jest.fn().mockResolvedValue(undefined);

describe("writeOuraRawEvents", () => {
  let infoSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreate.mockResolvedValue(undefined);
    mockGet.mockResolvedValue({ exists: false });
    mockSet.mockResolvedValue(undefined);
    (userCollection as jest.Mock).mockReturnValue({
      doc: () => ({ create: mockCreate, get: mockGet, set: mockSet }),
    });
    infoSpy = jest.spyOn(logger, "info").mockImplementation(() => undefined);
    errorSpy = jest.spyOn(logger, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    infoSpy.mockRestore();
    errorSpy.mockRestore();
  });

  function assertAllLoggedPrivacySafe(): void {
    for (const spy of [infoSpy, errorSpy]) {
      for (const call of spy.mock.calls) {
        assertOuraTelemetryPrivacy(call[0]);
      }
    }
  }

  it("awaits core writes and returns core-only counts when ouraRawItems are deferred", async () => {
    const sleepItems = [
      {
        idempotencyKey: "sleep_1",
        start: "2025-03-13T22:00:00.000Z",
        end: "2025-03-14T06:00:00.000Z",
        timezone: "UTC",
        day: "2025-03-14",
        totalMinutes: 480,
        isMainSleep: true,
      },
    ];
    const ouraRawItems = [
      { idempotencyKey: "oura_session_1", dataset: "session", data: { id: "s1" } },
      { idempotencyKey: "oura_tag_1", dataset: "tag", data: { id: "t1" } },
    ];

    const result = await writeOuraRawEvents("uid1", sleepItems, [], "req-1", {
      ouraRawItems,
    });

    expect(result.eventsCreated).toBe(1);
    expect(result.eventsAlreadyExists).toBe(0);
    expect(infoSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        msg: "oura_raw_events_core_write_done",
        operation: "oura_raw_events_core_write_done",
        rawEventCreatedCount: 1,
        rawEventExistingCount: 0,
        requestId: expect.stringMatching(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        ),
      }),
    );
    expect(infoSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        msg: "oura_raw_events_vendor_detail_deferred",
        rawItemCount: 2,
        requestId: expect.stringMatching(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        ),
      }),
    );
    assertAllLoggedPrivacySafe();
  });

  it("does not log deferred when ouraRawItems is empty", async () => {
    await writeOuraRawEvents("uid1", [], [], "req-2", {});

    expect(infoSpy).toHaveBeenCalledWith(
      expect.objectContaining({ msg: "oura_raw_events_core_write_done" }),
    );
    const deferredCalls = infoSpy.mock.calls.filter(
      (c: [Record<string, unknown>]) => c[0]?.msg === "oura_raw_events_vendor_detail_deferred",
    );
    expect(deferredCalls).toHaveLength(0);
    assertAllLoggedPrivacySafe();
  });
});
