import React, { useCallback, useLayoutEffect } from "react";
import { StyleSheet, View } from "react-native";
import { useFocusEffect, useNavigation, useRouter } from "expo-router";

import { useLabReviews } from "@/lib/data/labs/useLabReviews";
import { isLabsOsV1Enabled } from "@/lib/data/labs/labsOsFlag";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { LabReviewQueueContent } from "@/lib/ui/labs/LabReviewQueueContent";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";

export default function LabReviewsListScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const labsOs = isLabsOsV1Enabled();
  const reviews = useLabReviews({ enabled: labsOs });

  useLayoutEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("detail"),
      title: "Lab reports",
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
    });
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      if (!labsOs) return;
      reviews.refetch({ cacheBust: `focus-${Date.now()}` });
    }, [labsOs, reviews.refetch]),
  );

  return (
    <View style={styles.root}>
      <ModuleScreenShell title="Lab reports" hideTitleChrome>
        <LabReviewQueueContent
          status={reviews.status}
          {...(reviews.status === "error"
            ? { error: reviews.error, requestId: reviews.requestId, onRetry: () => reviews.refetch() }
            : {})}
          {...(reviews.status === "ready" ? { items: reviews.data.items } : {})}
          onPressReview={(documentId) => router.push(`/(app)/labs/reviews/${documentId}`)}
        />
      </ModuleScreenShell>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
