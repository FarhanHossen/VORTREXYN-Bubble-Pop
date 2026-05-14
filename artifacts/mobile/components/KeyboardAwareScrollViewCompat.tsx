/**
 * KeyboardAwareScrollViewCompat.tsx
 *
 * A platform-safe wrapper around KeyboardAwareScrollView.
 *
 * react-native-keyboard-controller's KeyboardAwareScrollView works great on
 * iOS and Android, but it doesn't support web. This component automatically
 * falls back to React Native's built-in ScrollView on web so screens that
 * use it don't need to handle the platform difference themselves.
 *
 * Usage: drop-in replacement for KeyboardAwareScrollView.
 */

import {
  KeyboardAwareScrollView,
  KeyboardAwareScrollViewProps,
} from "react-native-keyboard-controller";
import { Platform, ScrollView, ScrollViewProps } from "react-native";

type Props = KeyboardAwareScrollViewProps & ScrollViewProps;

/**
 * Renders KeyboardAwareScrollView on iOS/Android and a plain ScrollView on web.
 * Defaults keyboardShouldPersistTaps to "handled" so tapping outside an input
 * dismisses the keyboard without swallowing button taps.
 */
export function KeyboardAwareScrollViewCompat({
  children,
  keyboardShouldPersistTaps = "handled",
  ...props
}: Props) {
  // Web doesn't support react-native-keyboard-controller — use the basic ScrollView
  if (Platform.OS === "web") {
    return (
      <ScrollView keyboardShouldPersistTaps={keyboardShouldPersistTaps} {...props}>
        {children}
      </ScrollView>
    );
  }

  // Native: use the full keyboard-aware scroll view for smooth input handling
  return (
    <KeyboardAwareScrollView
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      {...props}
    >
      {children}
    </KeyboardAwareScrollView>
  );
}
