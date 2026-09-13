import {
  connectSourceCardsEqual,
  mapAppleHealthConnectCard,
  mapOuraConnectCard,
} from "../mapConnectSourceCards";

describe("mapConnectSourceCards", () => {
  it("maps Oura presence transitions without requiring local mirror state", () => {
    expect(mapOuraConnectCard({ status: "partial" }, { kind: "none" }).status).toBe("idle");
    expect(
      mapOuraConnectCard({ status: "ready", connected: false }, { kind: "none" }).status,
    ).toBe("idle");
    expect(
      mapOuraConnectCard({ status: "ready", connected: true }, { kind: "none" }).status,
    ).toBe("connected");
    expect(
      mapOuraConnectCard({ status: "ready", connected: false }, { kind: "connecting" }).status,
    ).toBe("connecting");
    expect(mapOuraConnectCard({ status: "error" }, { kind: "none" }).status).toBe("error");
  });

  it("maps Apple Health account connection independently of device availability", () => {
    expect(
      mapAppleHealthConnectCard({ status: "ready", connected: false }, { kind: "none" }).status,
    ).toBe("idle");
    expect(
      mapAppleHealthConnectCard({ status: "ready", connected: true }, { kind: "none" }).status,
    ).toBe("connected");
    expect(
      mapAppleHealthConnectCard(
        { status: "unavailable", reason: "n/a" },
        { kind: "none" },
      ).status,
    ).toBe("unavailable");
  });

  it("compares cards by semantic value", () => {
    const a = mapOuraConnectCard({ status: "ready", connected: false }, { kind: "none" });
    const b = mapOuraConnectCard({ status: "ready", connected: false }, { kind: "none" });
    expect(connectSourceCardsEqual(a, b)).toBe(true);
  });
});
