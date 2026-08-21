/**
 * Open approved public legal/support URLs via the system in-app browser.
 * Does not log identity or URL query parameters.
 */

import { Linking } from "react-native";
import * as WebBrowser from "expo-web-browser";

import {
  getPublicLink,
  type PublicLinkKind,
  PUBLIC_LINK_LABELS,
} from "@/lib/config/publicLinks";

export type OpenPublicLinkResult =
  | { ok: true }
  | { ok: false; title: string; message: string };

const UNAVAILABLE_MESSAGE =
  "This page is not available right now. Please try again later.";

const OPEN_FAILED: OpenPublicLinkResult = {
  ok: false,
  title: "Unable to open link",
  message: "Something went wrong opening that page. Please try again.",
};

export async function openPublicLink(kind: PublicLinkKind): Promise<OpenPublicLinkResult> {
  const resolution = getPublicLink(kind);
  if (resolution.status !== "configured") {
    return {
      ok: false,
      title: `${PUBLIC_LINK_LABELS[kind]} unavailable`,
      message: UNAVAILABLE_MESSAGE,
    };
  }

  const url = resolution.url;

  try {
    if (typeof Linking.canOpenURL === "function") {
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        return OPEN_FAILED;
      }
    }

    await WebBrowser.openBrowserAsync(url);
    return { ok: true };
  } catch {
    return OPEN_FAILED;
  }
}
