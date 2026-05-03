import type { Router } from "expo-router";
import { buildOverlayTabBarProps } from "@/components/navigation/buildOverlayTabBarProps";

describe("buildOverlayTabBarProps", () => {
  it("dispatches tab NAVIGATE to expo-router paths", () => {
    const push = jest.fn();
    const router = { push } as Pick<Router, "push"> as Router;
    const props = buildOverlayTabBarProps(router, { top: 0, bottom: 0, left: 0, right: 0 });
    props.navigation.dispatch({
      type: "NAVIGATE",
      payload: { name: "dash", merge: true },
    });
    expect(push).toHaveBeenCalledWith("/(app)/(tabs)/dash");
    props.navigation.dispatch({
      type: "NAVIGATE",
      payload: { name: "library", merge: true },
    });
    expect(push).toHaveBeenCalledWith("/(app)/(tabs)/library");
  });

  it("does not highlight primary tabs (focused route is manage)", () => {
    const router = { push: jest.fn() } as Pick<Router, "push"> as Router;
    const props = buildOverlayTabBarProps(router, { top: 0, bottom: 0, left: 0, right: 0 });
    expect(props.state.routes[props.state.index]?.name).toBe("manage");
  });
});
