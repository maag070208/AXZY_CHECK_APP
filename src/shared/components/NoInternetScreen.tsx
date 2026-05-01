import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Modal, AppState, AppStateStatus } from 'react-native';
import { Text, Button, Icon } from 'react-native-paper';
import NetInfo from '@react-native-community/netinfo';
import { theme } from '../theme/theme';

export const NoInternetScreen = () => {
  const [isConnected, setIsConnected] = useState<boolean | null>(true);

  // Initial check & listener
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
    });
    return () => unsubscribe();
  }, []);

  // Update check on app coming to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        checkConnection();
      }
    });
    return () => subscription.remove();
  }, []);

  const checkConnection = async () => {
    const state = await NetInfo.fetch();
    setIsConnected(state.isConnected);
  };

  if (isConnected === null || isConnected) {
    return null;
  }

  return (
    <Modal visible={!isConnected} animationType="fade" transparent={false}>
      <View style={styles.container}>
        <View style={styles.iconContainer}>
          <Icon source="wifi-off" size={80} color={theme.colors.error} />
        </View>
        <Text style={styles.title}>Sin conexión a Internet</Text>
        <Text style={styles.description}>
          La aplicación requiere conexión a internet para funcionar. 
          Por favor, revisa tu conexión WiFi o de datos móviles.
        </Text>
        <Button 
          mode="contained" 
          onPress={checkConnection} 
          style={styles.button}
          contentStyle={{ height: 50 }}
        >
          INTENTAR DE NUEVO
        </Button>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  button: {
    width: '100%',
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
  }
});
