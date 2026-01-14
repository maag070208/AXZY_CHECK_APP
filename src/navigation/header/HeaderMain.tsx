// components/headers/HeaderMain.tsx
import React from 'react';
import { TouchableOpacity, Text, View } from 'react-native';

export const HeaderMain = ({ navigation, title }: any) => {
  return (
    <View
      style={{
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        backgroundColor: 'white',
      }}
    >
      <TouchableOpacity onPress={() => navigation.getParent()?.openDrawer()}>
        <Text style={{ fontSize: 26 }}>☰</Text>
      </TouchableOpacity>

      <Text style={{ fontSize: 20, fontWeight: '600', marginLeft: 16 }}>
        {title}
      </Text>
    </View>
  );
};
