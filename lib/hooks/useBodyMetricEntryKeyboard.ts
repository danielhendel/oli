import { useEffect, useState } from "react";
import {
  Keyboard,
  Platform,
  type EmitterSubscription,
  type KeyboardEvent,
} from "react-native";

/**
 * Single keyboard-height source for Body metric entry sheets.
 * Resets to 0 on hide so resting layout never retains editing insets.
 */
export function useBodyMetricEntryKeyboard(enabled: boolean): {
  keyboardHeight: number;
  keyboardVisible: boolean;
} {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setKeyboardHeight(0);
      return;
    }

    const onShow = (event: KeyboardEvent) => {
      const next = event.endCoordinates?.height ?? 0;
      setKeyboardHeight(Number.isFinite(next) && next > 0 ? next : 0);
    };
    const onHide = () => {
      setKeyboardHeight(0);
    };

    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub: EmitterSubscription = Keyboard.addListener(showEvent, onShow);
    const hideSub: EmitterSubscription = Keyboard.addListener(hideEvent, onHide);

    return () => {
      showSub.remove();
      hideSub.remove();
      setKeyboardHeight(0);
    };
  }, [enabled]);

  return {
    keyboardHeight,
    keyboardVisible: keyboardHeight > 0,
  };
}
