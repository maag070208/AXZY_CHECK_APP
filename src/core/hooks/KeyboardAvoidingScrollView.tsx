import React, { ReactNode, useRef, useEffect } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  Keyboard,
  TextInput,
  findNodeHandle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  children: ReactNode;
  stickyFooter?: ReactNode;
  contentContainerStyle?: object;
  insideModal?: boolean;
};

const CustomKeyboardAvoidingScrollView = ({
  children,
  stickyFooter,
  contentContainerStyle,
  insideModal = false,
}: Props) => {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  // 👇 escucha el teclado y mueve el scroll
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => {
      const currentlyFocusedField = TextInput.State.currentlyFocusedInput?.();
      if (currentlyFocusedField && scrollRef.current) {
        const reactNode = findNodeHandle(currentlyFocusedField as any);
        if (reactNode) {
          scrollRef.current.scrollResponderScrollNativeHandleToKeyboard(
            reactNode,
            200, // espacio extra entre input y teclado
            true,
          );
        }
      }
    });

    return () => showSub.remove();
  }, []);

  return (
    <View style={styles.wrapper}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={
          Platform.OS === 'ios'
            ? insideModal
              ? 'height'
              : 'padding'
            : undefined
        }
        keyboardVerticalOffset={insideModal ? 0 : insets.top}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={[styles.content, contentContainerStyle]}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>

        {stickyFooter && (
          <View style={[styles.footer, { paddingBottom: insets.bottom }]}>
            {stickyFooter}
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: 'transparent' },
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { flexGrow: 1, padding: 16 },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ccc',
    backgroundColor: '#fff',
    padding: 12,
  },
});

export default CustomKeyboardAvoidingScrollView;
