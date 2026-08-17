import type { Router } from "expo-router";
import { buildOverlayTabBarProps } from "@/components/navigation/buildOverlayTabBarProps";
import { setPrimaryNavHealthV1EnabledForTests } from "@/lib/navigation/primaryNavHealthV1";

describe("buildOverlayTabBarProps (R1 four destinations)", () => {
  afterEach(() => {
    setPrimaryNavHealthV1EnabledForTests(null);
  });

  it("exposes Home, Plan, Progress, You regardless of deprecated flag", () => {
    setPrimaryNavHealthV1EnabledForTests(false);
    const router = { push: jest.fn() } as Pick<Router, "push"> as Router;
    const props = buildOverlayTabBarProps(router, { top: 0, bottom: 0, left: 0, right: 0 });
    expect(props.state.routes.map((r) => r.name)).toEqual(["dash", "program", "progress", "you"]);

    setPrimaryNavHealthV1EnabledForTests(true);
    const propsOn = buildOverlayTabBarProps(router, { top: 0, bottom: 0, left: 0, right: 0 });
    expect(propsOn.state.routes.map((r) => r.name)).toEqual(["dash", "program", "progress", "you"]);
  });

  it("dispatches tab NAVIGATE to expo-router Home path", () => {
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
      payload: { name: "program", merge: true },
    });
    expect(push).toHaveBeenCalledWith("/(app)/(tabs)/program");
  });

  it("selects Home when pathname is workouts landing", () => {
    const router = { push: jest.fn() } as Pick<Router, "push"> as Router;
    const props = buildOverlayTabBarProps(router, { top: 0, bottom: 0, left: 0, right: 0 }, {
      pathname: "/workouts",
    });
    expect(props.state.routes[props.state.index]?.name).toBe("dash");
  });

  it("does not expose Profile or Health as a primary overlay tab", () => {
    const router = { push: jest.fn() } as Pick<Router, "push"> as Router;
    const props = buildOverlayTabBarProps(router, { top: 0, bottom: 0, left: 0, right: 0 });
    expect(props.state.routes.map((r) => r.name)).not.toContain("profile");
    expect(props.state.routes.map((r) => r.name)).not.toContain("health");
    expect(props.state.routes.map((r) => r.name)).not.toContain("manage");
  });
});
