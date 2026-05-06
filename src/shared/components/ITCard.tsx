import React from 'react';
import { ViewStyle, StyleSheet } from 'react-native';
import { Card, useTheme } from 'react-native-paper';

interface ITCardProps {
  title?: string;
  subtitle?: string;
  onPress?: () => void;
  children?: React.ReactNode;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  left?: (props: any) => React.ReactNode;
  right?: (props: any) => React.ReactNode;
  elevation?: 0 | 1 | 2 | 3 | 4 | 5;
  mode?: 'elevated' | 'outlined' | 'contained';
}

export const ITCard: React.FC<ITCardProps> = ({
  title,
  subtitle,
  onPress,
  children,
  style,
  contentStyle,
  left,
  right,
  elevation = 1,
  mode = 'elevated',
}) => {
  const theme = useTheme();

  return (
    <Card
      onPress={onPress}
      style={[{ backgroundColor: theme.colors.surface }, styles.card, style]}
      elevation={elevation}
      mode={mode}
    >
      {(title || subtitle || left || right) && (
        <Card.Title
          title={title}
          subtitle={subtitle}
          left={left}
          right={right}
          titleStyle={[styles.title, { color: theme.colors.primary }]}
          subtitleStyle={styles.subtitle}
        />
      )}
      <Card.Content style={[styles.content, contentStyle]}>
        {children}
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 13,
  },
  content: {
    paddingTop: 8,
  },
});
