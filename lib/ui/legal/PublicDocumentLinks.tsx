/**
 * Shared Privacy Policy / Terms / Support link rows.
 * Renders only configured HTTPS destinations as tappable controls.
 */

import React, { useCallback, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import {
  getPublicLinks,
  PUBLIC_LINK_LABELS,
  type PublicLinkKind,
  type PublicLinksSnapshot,
} from "@/lib/config/publicLinks";
import { openPublicLink } from "@/lib/linking/openPublicLink";
import { UI_TEXT_MUTED, UI_TEXT_PRIMARY, UI_TEXT_SECONDARY } from "@/lib/ui/theme/uiTokens";

export type PublicDocumentLinksProps = {
  kinds?: readonly PublicLinkKind[];
  /** Optional intro shown above the link rows. */
  intro?: string;
  testID?: string;
  /** Injected snapshot for tests; defaults to live env resolution. */
  links?: PublicLinksSnapshot;
};

const DEFAULT_KINDS: readonly PublicLinkKind[] = [
  "privacyPolicy",
  "termsOfService",
  "support",
];

export function PublicDocumentLinks({
  kinds = DEFAULT_KINDS,
  intro,
  testID = "public-document-links",
  links,
}: PublicDocumentLinksProps) {
  const snapshot = links ?? getPublicLinks();
  const [openingKind, setOpeningKind] = useState<PublicLinkKind | null>(null);
  const openingRef = useRef(false);

  const onPress = useCallback(async (kind: PublicLinkKind) => {
    if (openingRef.current) return;
    openingRef.current = true;
    setOpeningKind(kind);
    try {
      const result = await openPublicLink(kind);
      if (!result.ok) {
        Alert.alert(result.title, result.message);
      }
    } finally {
      openingRef.current = false;
      setOpeningKind(null);
    }
  }, []);

  return (
    <View style={styles.root} testID={testID}>
      {intro ? (
        <Text style={styles.intro} testID={`${testID}-intro`}>
          {intro}
        </Text>
      ) : null}
      {kinds.map((kind) => {
        const resolution = snapshot[kind];
        const label = PUBLIC_LINK_LABELS[kind];
        const rowTestId = `${testID}-${kind}`;

        if (resolution.status !== "configured") {
          return (
            <Text
              key={kind}
              style={styles.unavailable}
              accessibilityRole="text"
              testID={`${rowTestId}-unavailable`}
            >
              {label} is not available right now.
            </Text>
          );
        }

        const busy = openingKind === kind;
        return (
          <Pressable
            key={kind}
            accessibilityRole="link"
            accessibilityLabel={label}
            accessibilityState={{ disabled: busy }}
            disabled={busy}
            onPress={() => {
              void onPress(kind);
            }}
            style={({ pressed }) => [styles.link, pressed && styles.linkPressed, busy && styles.linkBusy]}
            testID={rowTestId}
          >
            <Text style={styles.linkText}>{busy ? "Opening…" : label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 8 },
  intro: {
    fontSize: 14,
    lineHeight: 20,
    color: UI_TEXT_SECONDARY,
    marginBottom: 4,
  },
  link: {
    minHeight: 44,
    justifyContent: "center",
  },
  linkPressed: { opacity: 0.85 },
  linkBusy: { opacity: 0.55 },
  linkText: {
    fontSize: 15,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
    textDecorationLine: "underline",
  },
  unavailable: {
    minHeight: 44,
    fontSize: 14,
    lineHeight: 20,
    color: UI_TEXT_MUTED,
    textAlignVertical: "center",
  },
});
