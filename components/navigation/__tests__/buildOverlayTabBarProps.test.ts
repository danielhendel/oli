import type { Router } from "expo-router";
import { buildOverlayTabBarProps } from "@/components/navigation/buildOverlayTabBarProps";
import { setPrimaryNavHealthV1EnabledForTests } from "@/lib/navigation/primaryNavHealthV1";

describe("buildOverlayTabBarProps (legacy)", () => {
  beforeEach(() => {
    setPrimaryNavHealthV1EnabledForTests(false);
  });

  afterEach(() => {
    setPrimaryNavHealthV1EnabledForTests(null);
  });

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
    props.navigation.dispatch({
      type: "NAVIGATE",
      payload: { name: "program", merge: true },
    });
    expect(push).toHaveBeenCalledWith("/(app)/(tabs)/program");
  });

  it("exposes the four primary tabs in order (Dash, Timeline, Program, Library) plus Manage", () => {
    const router = { push: jest.fn() } as Pick<Router, "push"> as Router;
    const props = buildOverlayTabBarProps(router, { top: 0, bottom: 0, left: 0, right: 0 });
    expect(props.state.routes.map((r) => r.name)).toEqual([
      "dash",
      "timeline",
      "program",
      "library",
      "manage",
    ]);
  });

  it("no longer exposes Profile as a primary tab", () => {
    const router = { push: jest.fn() } as Pick<Router, "push"> as Router;
    const props = buildOverlayTabBarProps(router, { top: 0, bottom: 0, left: 0, right: 0 });
    expect(props.state.routes.map((r) => r.name)).not.toContain("profile");
  });

  it("does not highlight primary tabs (focused route is manage)", () => {
    const router = { push: jest.fn() } as Pick<Router, "push"> as Router;
    const props = buildOverlayTabBarProps(router, { top: 0, bottom: 0, left: 0, right: 0 });
    expect(props.state.routes[props.state.index]?.name).toBe("manage");
  });
});

describe("buildOverlayTabBarProps (health v1)", () => {
  beforeEach(() => {
    setPrimaryNavHealthV1EnabledForTests(true);
  });

  afterEach(() => {
    setPrimaryNavHealthV1EnabledForTests(null);
  });

  it("exposes Dash, Strength, Cardio, Nutrition, Health", () => {
    const router = { push: jest.fn() } as Pick<Router, "push"> as Router;
    const props = buildOverlayTabBarProps(router, { top: 0, bottom: 0, left: 0, right: 0 });
    expect(props.state.routes.map((r) => r.name)).toEqual([
      "dash",
      "strength",
      "cardio",
      "nutrition",
      "health",
    ]);
  });

  it("selects Strength when pathname is workouts landing", () => {
    const router = { push: jest.fn() } as Pick<Router, "push"> as Router;
    const props = buildOverlayTabBarProps(router, { top: 0, bottom: 0, left: 0, right: 0 }, {
      pathname: "/workouts",
    });
    expect(props.state.routes[props.state.index]?.name).toBe("strength");
  });

  it("dispatches Strength/Cardio/Nutrition to existing stack hrefs", () => {
    const push = jest.fn();
    const router = { push } as Pick<Router, "push"> as Router;
    const props = buildOverlayTabBarProps(router, { top: 0, bottom: 0, left: 0, right: 0 });
    props.navigation.dispatch({ type: "NAVIGATE", payload: { name: "strength" } });
    expect(push).toHaveBeenCalledWith("/(app)/workouts");
    props.navigation.dispatch({ type: "NAVIGATE", payload: { name: "cardio" } });
    expect(push).toHaveBeenCalledWith("/(app)/cardio");
    props.navigation.dispatch({ type: "NAVIGATE", payload: { name: "nutrition" } });
    expect(push).toHaveBeenCalledWith("/(app)/nutrition");
  });
});
