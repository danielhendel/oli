// Fixed top chrome for bottom-tab root screens: shared horizontal inset + PageTitleRow (title / optional subtitle / settings gear).
import { View, StyleSheet } from "react-native";
import { PageTitleRow, type PageTitleRowProps } from "@/lib/ui/PageTitleRow";
import { UI_APP_SCREEN_BG, UI_TAB_ROOT_INSET } from "@/lib/ui/theme/uiTokens";

export type TabRootScreenHeaderProps = Pick<
  PageTitleRowProps,
  "title" | "subtitle" | "subtitleVariant" | "rightSlot"
>;

export function TabRootScreenHeader(props: TabRootScreenHeaderProps) {
  return (
    <View style={styles.wrap}>
      <PageTitleRow {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: UI_TAB_ROOT_INSET,
    paddingTop: 16,
    paddingBottom: 10,
    backgroundColor: UI_APP_SCREEN_BG,
  },
});
