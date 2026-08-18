import React, { useEffect, useRef, useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { Button, Icon, Text } from 'react-native-paper';
import NetInfo from '@react-native-community/netinfo';
import { theme } from '../theme/theme';

/**
 * @description Pantalla de confirmación al perder el WiFi. Al salir de la zona
 * con WiFi se abre una pantalla a pantalla completa donde el guardia debe
 * presionar "Confirmar". No bloquea la app: tras confirmar puede seguir
 * trabajando y todo se subirá en caseta.
 */
export const NoInternetScreen = () => {
  const [hasWifi, setHasWifi] = useState<boolean | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const wasWifiRef = useRef<boolean | null>(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setHasWifi(state.type === 'wifi');
    });
    return () => unsubscribe();
  }, []);

  // Abre la pantalla de confirmación al pasar de tener WiFi a no tenerlo.
  useEffect(() => {
    if (hasWifi === null) return;

    if (wasWifiRef.current === true && hasWifi === false) {
      setShowConfirm(true);
    }
    wasWifiRef.current = hasWifi;
  }, [hasWifi]);

  const offline = hasWifi === false;

  return (
    <>
      {/* PANTALLA DE CONFIRMACIÓN AL PERDER EL WIFI */}
      <Modal
        visible={showConfirm}
        animationType="slide"
        onRequestClose={() => setShowConfirm(false)}
      >
        <View style={styles.screen}>
          <View style={styles.iconContainer}>
            <Icon source="wifi-off" size={72} color="#f59e0b" />
          </View>
          <Text style={styles.title}>Se perdió la conexión WiFi</Text>
          <Text style={styles.description}>
            Lo que hagas a partir de ahora tendrás que subirlo en caseta.
          </Text>
          <Button
            mode="contained"
            onPress={() => setShowConfirm(false)}
            style={styles.confirmBtn}
            contentStyle={{ height: 52 }}
            labelStyle={{ fontSize: 16, fontWeight: '800' }}
          >
            Confirmar
          </Button>
        </View>
      </Modal>

      {/* BANNER NO BLOQUEANTE MIENTRAS NO HAY WIFI */}
      {offline && (
        <View style={styles.banner}>
          <Icon source="wifi-off" size={16} color="#ffffff" />
          <Text style={styles.bannerText}>
            Sin WiFi — lo que hagas se subirá en caseta
          </Text>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  iconContainer: {
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1e293b',
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 32,
    lineHeight: 24,
  },
  confirmBtn: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f59e0b',
    paddingVertical: 6,
    paddingHorizontal: 12,
    minHeight: 30,
  },
  bannerText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    flexShrink: 1,
    textAlign: 'center',
  },
});
