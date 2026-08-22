import { YOU_HUB_ALL_ITEMS } from "@/lib/navigation/youHubItems";

describe("You hub Account routing (Stage 1A)", () => {
  it("routes Account to settings/account and keeps Settings distinct", () => {
    const account = YOU_HUB_ALL_ITEMS.find((item) => item.id === "account");
    const settings = YOU_HUB_ALL_ITEMS.find((item) => item.id === "settings");

    expect(account?.label).toBe("Account");
    expect(account?.accessibilityLabel).toBe("Account");
    expect(account?.href).toBe("/(app)/settings/account");

    expect(settings?.label).toBe("Settings");
    expect(settings?.href).toBe("/(app)/settings");

    expect(account?.href).not.toBe(settings?.href);
  });
});
