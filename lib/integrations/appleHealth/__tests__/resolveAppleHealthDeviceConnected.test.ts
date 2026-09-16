import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import { resolveAppleHealthDeviceConnected } from "../resolveAppleHealthDeviceConnected";

const mockGetAppleHealthConnected = jest.fn(async () => false);

jest.mock("@/lib/integrations/appleHealth/storage", () => ({
  getAppleHealthConnected: () => mockGetAppleHealthConnected(),
}));

describe("resolveAppleHealthDeviceConnected", () => {
  beforeEach(() => {
    mockGetAppleHealthConnected.mockReset();
    mockGetAppleHealthConnected.mockResolvedValue(false);
  });

  it("returns true when API already reports connected (no local flag probe needed for truth)", async () => {
    await expect(resolveAppleHealthDeviceConnected(true)).resolves.toBe(true);
  });

  it("returns true when API not connected but this account explicitly connected locally", async () => {
    mockGetAppleHealthConnected.mockResolvedValue(true);
    await expect(resolveAppleHealthDeviceConnected(false)).resolves.toBe(true);
    expect(mockGetAppleHealthConnected).toHaveBeenCalled();
  });

  it("returns false when API not connected and local account flag is false (HK grant alone does not connect)", async () => {
    mockGetAppleHealthConnected.mockResolvedValue(false);
    await expect(resolveAppleHealthDeviceConnected(false)).resolves.toBe(false);
  });
});
