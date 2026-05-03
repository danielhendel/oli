// Fixed top chrome for bottom-tab root screens: shared horizontal inset + PageTitleRow (title / optional subtitle / settings gear).
import { View, StyleSheet } from "react-native";
import { PageTitleRow, type PageTitleRowProps } from "@/lib/ui/PageTitleRow";
import { UI_APP_SCREEN_BG, UI_TAB_ROOT_CONTENT_GUTTER, UI_TAB_ROOT_INSET } from "@/lib/ui/theme/uiTokens";

export type TabRootScreenHeaderProps = Pick<
  PageTitleRowProps,
  "title" | "subtitle" | "subtitleVariant" | "rightSlot"
> & {
  /**
   * Override default title inset (defaults to `UI_TAB_ROOT_CONTENT_GUTTER` so tab titles align with primary body text).
   */
  leadingInsetExtra?: number;
};

export function TabRootScreenHeader({
  leadingInsetExtra = UI_TAB_ROOT_CONTENT_GUTTER,
  ...props
}: TabRootScreenHeaderProps) {
  return (
    <View
      style={[
        styles.wrap,
        {
          paddingLeft: UI_TAB_ROOT_INSET + leadingInsetExtra,
          paddingRight: UI_TAB_ROOT_INSET,
        },
      ]}
    >
      <PageTitleRow {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: UI_APP_SCREEN_BG,
  },
});
