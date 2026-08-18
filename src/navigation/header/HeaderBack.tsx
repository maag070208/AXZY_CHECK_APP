// components/headers/HeaderBack.tsx
import React from 'react';
import { TouchableOpacity, View, Text } from 'react-native';
import { Icon } from 'react-native-paper';

interface HeaderBackProps {
  navigation?: any;
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  back?: boolean;
}

export const HeaderBack = ({ navigation, title, subtitle, onBack, right }: HeaderBackProps) => {
  return (
    <View
      style={{
        minHeight: 56,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: subtitle ? 8 : 0,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
      }}
    >
      <TouchableOpacity
        onPress={() => (onBack ? onBack() : navigation?.goBack())}
        style={{
          backgroundColor: '#e2e8f0',
          width: 36,
          height: 36,
          borderRadius: 10,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Icon source="arrow-left" size={22} color="#334155" />
      </TouchableOpacity>

      <View style={{ flex: 1, marginLeft: 16 }}>
        <Text style={{ fontSize: 20, fontWeight: '600', color: '#0f172a' }}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {right ? right : null}
    </View>
  );
};
