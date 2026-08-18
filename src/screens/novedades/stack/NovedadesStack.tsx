import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { HeaderBack } from '../../../navigation/header/HeaderBack';
import { theme } from '../../../shared/theme/theme';
import { useNovedades } from '../hooks/useNovedades';
import { NovedadesScreen } from '../screens/NovedadesScreen';

const Stack = createNativeStackNavigator();

/**
 * @description Stack de novedades: pantalla de chat en tiempo real con el
 * estado de conexión en el header.
 */
const NovedadesStack = () => {
  const { connected } = useNovedades();

  return (
    <Stack.Navigator>
      <Stack.Screen
        name="NOVEDADES_SCREEN"
        component={NovedadesScreen}
        options={({ navigation }) => ({
          header: () => (
            <HeaderBack
              navigation={navigation}
              title="Novedades"
              subtitle="Comunicación operativa en tiempo real"
              right={
                <View style={styles.statusBadge}>
                  <View style={[styles.statusDot, connected ? styles.statusDotOn : styles.statusDotOff]} />
                  <Text style={styles.statusText}>{connected ? 'En vivo' : 'Sin conexión'}</Text>
                </View>
              }
            />
          ),
        })}
      />
    </Stack.Navigator>
  );
};

export default NovedadesStack;

const styles = StyleSheet.create({
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: theme.colors.lightGray,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusDotOn: {
    backgroundColor: '#10b981',
  },
  statusDotOff: {
    backgroundColor: '#94a3b8',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
});
