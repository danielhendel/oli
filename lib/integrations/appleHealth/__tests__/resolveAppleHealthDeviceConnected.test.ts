import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import { HK_AUTH_SHARING_AUTHORIZED } from "@/lib/data/body/appleHealthBodyUxPhase";
import { resolveAppleHealthDeviceConnected } from "../resolveAppleHealthDeviceConnected";

const mockGetBodyCompositionReadAuthStatus = jest.fn();

jest.mock("react-native", () => ({
  Platform: { OS: "ios" },
}));

jest.mock("@/lib/integrations/appleHealth", () => ({
  getBodyCompositionReadAuthStatus: (...args: unknown[]) =>
    mockGetBodyCompositionReadAuthStatus(...args),
}));

describe("resolveAppleHealthDeviceConnected", () => {
  beforeEach(() => {
    mockGetBodyCompositionReadAuthStatus.mockReset();
  });

  it("returns true when API already reports connected (no HealthKit probe)", async () => {
    await expect(resolveAppleHealthDeviceConnected(true)).resolves.toBe(true);
    expect(mockGetBodyCompositionReadAuthStatus).not.toHaveBeenCalled();
  });

  it("returns true when API not connected but HealthKit body read is authorized", async () => {
    mockGetBodyCompositionReadAuthStatus.mockResolvedValue({
      ok: true,
      bodyMassStatus: HK_AUTH_SHARING_AUTHORIZED,
      readStatuses: [HK_AUTH_SHARING_AUTHORIZED],
    });
    await expect(resolveAppleHealthDeviceConnected(false)).resolves.toBe(true);
    expect(mockGetBodyCompositionReadAuthStatus).toHaveBeenCalled();
  });

  it("returns false when API not connected and HealthKit probe fails", async () => {
    mockGetBodyCompositionReadAuthStatus.mockResolvedValue({ ok: false, error: "unavailable" });
    await expect(resolveAppleHealthDeviceConnected(false)).resolves.toBe(false);
  });
});
