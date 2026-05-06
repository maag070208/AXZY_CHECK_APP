import React from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useTheme } from 'react-native-paper';

interface ITScreenWrapperProps {
  children: React.ReactNode;
  footer?: React.ReactNode;
  scrollable?: boolean;
  padding?: boolean;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  edges?: Edge[];
  keyboardShouldPersistTaps?: 'handled' | 'always' | 'never';
}

export const ITScreenWrapper: React.FC<ITScreenWrapperProps> = ({
  children,
  footer,
  scrollable = true,
  padding = true,
  style,
  contentContainerStyle,
  edges = ['right', 'left'],
  keyboardShouldPersistTaps = 'handled',
}) => {
  const theme = useTheme();

  const containerStyle = [
    styles.container,
    { backgroundColor: theme?.colors?.background || '#f8f8f8' },
    style,
  ];

  const renderContent = () => {
    if (scrollable) {
      return (
        <KeyboardAwareScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.scrollContent,
            padding && styles.padding,
            contentContainerStyle,
          ]}
          keyboardShouldPersistTaps={keyboardShouldPersistTaps}
          enableOnAndroid={true}
          enableAutomaticScroll={true}
          extraScrollHeight={120}
          extraHeight={120}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </KeyboardAwareScrollView>
      );
    }
    return (
      <View
        style={[styles.flex, padding && styles.padding, contentContainerStyle]}
      >
        {children}
      </View>
    );
  };

  return (
    <SafeAreaView style={containerStyle} edges={edges}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={theme.colors.background}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {renderContent()}
        {footer && (
          <View style={[padding && styles.padding, styles.footer]}>
            {footer}
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  padding: {
    paddingHorizontal: 20,
  },
  scrollContent: {
    flexGrow: 1,
  },
  footer: {
    paddingBottom: 16,
    paddingTop: 8,
  },
});
