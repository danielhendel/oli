import type { Router, Href } from "expo-router";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { CommonActions } from "@react-navigation/native";
import { normalizePathname } from "@/lib/navigation/normalizePathname";
import {
  PRIMARY_NAV_TAB_HREFS,
  type PrimaryNavigationDestination,
  type PrimaryNavigationItem,
  assertNeverPrimaryDestination,
} from "@/lib/navigation/primaryNavigationConfig";

function destinationMatchesPathname(
  id: PrimaryNavigationDestination,
  pathname: string | null | undefined,
): boolean {
  const p = normalizePathname(pathname);
  switch (id) {
    case "home":
      return p === "/dash";
    case "plan":
      return p === "/program";
    case "progress":
      return p === "/progress";
    case "you":
      return p === "/you";
    default:
      return assertNeverPrimaryDestination(id);
  }
}

export type NavigatePrimaryDestinationArgs = {
  item: PrimaryNavigationItem;
  activeDestination: PrimaryNavigationDestination | null;
  pathname: string | null | undefined;
  router: Pick<Router, "push" | "replace">;
  /** Real tab navigator props when mounted inside `(tabs)`. */
  tabBarProps?: BottomTabBarProps | null;
  /** @deprecated Health menu is not a primary destination. Ignored. */
  onHealthMenuPress?: () => void;
};

/**
 * Navigate to a primary destination without duplicating the current screen.
 */
export function navigatePrimaryDestination(args: NavigatePrimaryDestinationArgs): void {
  const { item, activeDestination, pathname, router, tabBarProps } = args;
  const action = item.action;

  if (activeDestination === item.id && destinationMatchesPathname(item.id, pathname)) {
    return;
  }

  if (action.kind === "tab") {
    if (tabBarProps) {
      const { state, navigation } = tabBarProps;
      const route = state.routes.find((r) => r.name === action.tabName);
      if (!route) {
        router.push(PRIMARY_NAV_TAB_HREFS[item.id] as Href);
        return;
      }
      const alreadyFocused = state.routes[state.index]?.name === route.name;
      if (alreadyFocused) return;
      const event = navigation.emit({
        type: "tabPress",
        target: route.key,
        canPreventDefault: true,
      });
      if (event.defaultPrevented) return;
      const navAction = CommonActions.navigate({
        name: route.name,
        merge: true,
        ...(route.params !== undefined ? { params: route.params as object } : {}),
      });
      navigation.dispatch(
        Object.assign(navAction, { target: state.key }) as Parameters<
          typeof navigation.dispatch
        >[0],
      );
      return;
    }
    router.push(PRIMARY_NAV_TAB_HREFS[item.id] as Href);
    return;
  }
}
