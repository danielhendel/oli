import React, { useLayoutEffect } from "react";
import { StyleSheet, View } from "react-native";
import { useNavigation } from "expo-router";

import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { HealthRecordPlaceholderScreen } from "@/lib/ui/health/HealthRecordPlaceholderScreen";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";

export default function SupplementsPlaceholderScreen() {
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("module"),
      title: "Supplements",
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
    });
  }, [navigation]);

  return (
    <View style={styles.root}>
      <HealthRecordPlaceholderScreen
        title="Supplements"
        description="Keep a current record of supplements, vitamins, and performance products you use."
        emptyTitle="Not set up yet"
        emptyDescription="This record system is not implemented yet. Supplements cannot be stored here until persistence ships."
        icon="leaf-outline"
        actionLabel="Add Supplement"
        actionDisabled
        testID="supplements-placeholder"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
