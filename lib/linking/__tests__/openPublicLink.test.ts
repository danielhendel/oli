import { openPublicLink } from "@/lib/linking/openPublicLink";
import { getPublicLink } from "@/lib/config/publicLinks";

jest.mock("@/lib/config/publicLinks", () => {
  const actual = jest.requireActual("@/lib/config/publicLinks");
  return {
    ...actual,
    getPublicLink: jest.fn(),
  };
});

const mockCanOpenURL = jest.fn();
const mockOpenBrowserAsync = jest.fn();

jest.mock("react-native", () => ({
  Linking: {
    canOpenURL: (...args: unknown[]) => mockCanOpenURL(...args),
  },
}));

jest.mock("expo-web-browser", () => ({
  openBrowserAsync: (...args: unknown[]) => mockOpenBrowserAsync(...args),
}));

const mockedGetPublicLink = getPublicLink as jest.MockedFunction<typeof getPublicLink>;

describe("openPublicLink", () => {
  beforeEach(() => {
    mockedGetPublicLink.mockReset();
    mockCanOpenURL.mockReset();
    mockOpenBrowserAsync.mockReset();
  });

  it("opens a configured Privacy Policy URL", async () => {
    mockedGetPublicLink.mockReturnValue({
      status: "configured",
      url: "https://docs.oli.health/privacy",
    });
    mockCanOpenURL.mockResolvedValue(true);
    mockOpenBrowserAsync.mockResolvedValue({ type: "dismiss" });

    const result = await openPublicLink("privacyPolicy");
    expect(result).toEqual({ ok: true });
    expect(mockOpenBrowserAsync).toHaveBeenCalledWith("https://docs.oli.health/privacy");
  });

  it("opens configured Terms and Support URLs", async () => {
    mockCanOpenURL.mockResolvedValue(true);
    mockOpenBrowserAsync.mockResolvedValue({ type: "dismiss" });

    mockedGetPublicLink.mockReturnValue({
      status: "configured",
      url: "https://docs.oli.health/terms",
    });
    expect(await openPublicLink("termsOfService")).toEqual({ ok: true });
    expect(mockOpenBrowserAsync).toHaveBeenCalledWith("https://docs.oli.health/terms");

    mockedGetPublicLink.mockReturnValue({
      status: "configured",
      url: "https://docs.oli.health/support",
    });
    expect(await openPublicLink("support")).toEqual({ ok: true });
    expect(mockOpenBrowserAsync).toHaveBeenCalledWith("https://docs.oli.health/support");
  });

  it("maps unavailable configuration safely", async () => {
    mockedGetPublicLink.mockReturnValue({ status: "unavailable", reason: "missing" });
    const result = await openPublicLink("privacyPolicy");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).not.toMatch(/missing|EXPO_PUBLIC|Firebase/i);
    expect(mockOpenBrowserAsync).not.toHaveBeenCalled();
  });

  it("maps cannot-open state safely", async () => {
    mockedGetPublicLink.mockReturnValue({
      status: "configured",
      url: "https://docs.oli.health/privacy",
    });
    mockCanOpenURL.mockResolvedValue(false);
    const result = await openPublicLink("privacyPolicy");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.title).toMatch(/unable to open/i);
    expect(mockOpenBrowserAsync).not.toHaveBeenCalled();
  });

  it("maps open failures without raw OS errors", async () => {
    mockedGetPublicLink.mockReturnValue({
      status: "configured",
      url: "https://docs.oli.health/privacy",
    });
    mockCanOpenURL.mockResolvedValue(true);
    mockOpenBrowserAsync.mockRejectedValue(new Error("NSCocoaErrorDomain code=1234"));
    const result = await openPublicLink("privacyPolicy");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(JSON.stringify(result)).not.toMatch(/NSCocoaErrorDomain|1234/);
  });
});
