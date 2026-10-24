import React from 'react';
import { StyleSheet, View } from 'react-native';
import { HeaderBack } from '../../../navigation/header/HeaderBack';
import { GuardDashboard } from './GuardDashboard';

/**
 * La ronda del Jefe de Guardias reutiliza exactamente la misma pantalla de
 * ronda que Guardia/Mantenimiento (`GuardDashboard`), solo con el encabezado
 * de navegación. No hay una variante visual distinta.
 */
export const ShiftRoundScreen = ({ navigation }: any) => (
  <View style={styles.screen}>
    <HeaderBack navigation={navigation} title="Mi ronda" />
    <GuardDashboard roundOnly />
  </View>
);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F4F9F6' },
});
