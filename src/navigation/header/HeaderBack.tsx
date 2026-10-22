import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';

export const HeaderBack = ({
  navigation,
  title,
  onBack,
  icon = 'arrow-left',
  accessibilityLabel = 'Volver',
}: any) => {
  return (
    <View style={styles.outer}>
      <View style={styles.card}>
        <TouchableOpacity
          onPress={onBack ?? (() => navigation.goBack())}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icon source={icon} size={21} color="#065911" />
        </TouchableOpacity>

        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E6EEE9',
  },
  card: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: '#E8F7EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    marginLeft: 10,
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
});
