// components/headers/HeaderBack.tsx
import React from 'react';
import { TouchableOpacity, View, Text } from 'react-native';
import { Icon } from 'react-native-paper';

export const HeaderBack = ({ navigation, title }: any) => {
  return (
    <View
      style={{
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        backgroundColor: 'white',
      }}
    >
      <TouchableOpacity
        onPress={() => navigation.goBack()}
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

      <Text style={{ fontSize: 20, fontWeight: '600', marginLeft: 16 }}>
        {title}
      </Text>
    </View>
  );
};
