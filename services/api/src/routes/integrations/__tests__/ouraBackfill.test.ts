/**
 * Oura backfill — chunked, idempotent historical pull for sleep + readiness.
 */
import { triggerOuraBackfill } from "../ouraPullNow";

jest.mock("../../../db", () => ({
  userCollection: jest.fn(() => ({ doc: () => ({ set: jest.fn().mockResolvedValue(undefined) }) })),
  FieldValue: { serverTimestamp: () => ({ _serverTimestamp: true }) },
  ouraConnectedRegistryDoc: jest.fn(() => ({ delete: jest.fn().mockResolvedValue(undefined) })),
}));

jest.mock("../../../lib/ouraSecrets", () => ({
  getRefreshToken: jest.fn(),
  getClientSecret: jest.fn().mockResolvedValue("secret"),
  setRefreshToken: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../../../lib/ouraApi", () => ({
  ...jest.requireActual("../../../lib/ouraApi"),
  refreshOuraAccessToken: jest.fn(),
  fetchOuraSleep: jest.fn().mockResolvedValue([]),
  fetchOuraDailyReadiness: jest.fn().mockResolvedValue([]),
}));

jest.mock("../../../lib/ouraIngestWrite", () => ({
  writeOuraRawEvents: jest.fn().mockResolvedValue({ eventsCreated: 0, eventsAlreadyExists: 0 }),
}));

jest.mock("../../../lib/ouraVendorSnapshot", () => ({
  writeOuraVendorSleepSnapshots: jest.fn().mockResolvedValue({
    attempted: 0,
    written: 0,
    skippedMissingDay: 0,
    errors: 0,
  }),
  writeOuraVendorReadinessSnapshots: jest.fn().mockResolvedValue({
    attempted: 0,
    written: 0,
    skippedMissingDay: 0,
    errors: 0,
  }),
}));

const ouraSecrets = require("../../../lib/ouraSecrets");
const ouraApi = require("../../../lib/ouraApi");
const ouraIngestWrite = require("../../../lib/ouraIngestWrite");
const ouraVendorSnapshot = require("../../../lib/ouraVendorSnapshot");

describe("triggerOuraBackfill", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (ouraSecrets.getRefreshToken as jest.Mock).mockResolvedValue("rt_xxx");
    (ouraApi.refreshOuraAccessToken as jest.Mock).mockResolvedValue({
      access_token: "at_yyy",
      refresh_token: "rt_new",
      expires_in: 86400,
    });
  });

  it("skips when no refresh token", async () => {
    (ouraSecrets.getRefreshToken as jest.Mock).mockResolvedValue(null);
    await triggerOuraBackfill("uid1", "req-1");
    expect(ouraApi.refreshOuraAccessToken).not.toHaveBeenCalled();
    expect(ouraApi.fetchOuraSleep).not.toHaveBeenCalled();
  });

  it("runs 3 chunks (90→60, 60→30, 30→0 days) and writes idempotently", async () => {
    process.env.OURA_CLIENT_ID = "oura-client-id";
    (ouraApi.fetchOuraSleep as jest.Mock).mockResolvedValue([]);
    (ouraApi.fetchOuraDailyReadiness as jest.Mock).mockResolvedValue([]);

    await triggerOuraBackfill("uid1", "backfill-req-1");

    expect(ouraSecrets.getRefreshToken).toHaveBeenCalledWith("uid1");
    expect(ouraApi.refreshOuraAccessToken).toHaveBeenCalledTimes(1);
    expect(ouraApi.fetchOuraSleep).toHaveBeenCalledTimes(3);
    expect(ouraApi.fetchOuraDailyReadiness).toHaveBeenCalledTimes(3);
    expect(ouraIngestWrite.writeOuraRawEvents).toHaveBeenCalledTimes(3);
    expect(ouraVendorSnapshot.writeOuraVendorSleepSnapshots).toHaveBeenCalledTimes(3);
    expect(ouraVendorSnapshot.writeOuraVendorReadinessSnapshots).toHaveBeenCalledTimes(3);

    expect(ouraIngestWrite.writeOuraRawEvents).toHaveBeenCalledWith(
      "uid1",
      expect.any(Array),
      expect.any(Array),
      "backfill-req-1",
      {},
    );
  });

  it("continues on chunk error (resumable)", async () => {
    process.env.OURA_CLIENT_ID = "oura-client-id";
    (ouraApi.fetchOuraSleep as jest.Mock)
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce([]);
    (ouraApi.fetchOuraDailyReadiness as jest.Mock).mockResolvedValue([]);

    await triggerOuraBackfill("uid1", "backfill-req-2");

    expect(ouraApi.fetchOuraSleep).toHaveBeenCalledTimes(3);
    expect(ouraIngestWrite.writeOuraRawEvents).toHaveBeenCalledTimes(2);
  });
});
