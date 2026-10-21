import React from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import LottieView from 'lottie-react-native';
import { useAppSelector } from '../../core/store/hooks';

export default function LoaderComponent() {
  const { loading } = useAppSelector(state => state.loaderState);

  return (
    <View style={styles.root}>
      <Modal transparent animationType="fade" visible={loading} statusBarTranslucent>
        <View style={styles.centeredView}>
          <View style={styles.loaderBox} accessibilityLabel="Cargando">
            <LottieView
              source={require('../../shared/assets/lottie/checkapp-icon.lottie.json')}
              autoPlay
              loop
              speed={1.2}
              resizeMode="cover"
              style={styles.lottie}
            />
          </View>
          <Text style={styles.loadingText}>Cargando…</Text>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    position: 'absolute',
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(6, 26, 18, 0.55)',
  },
  loaderBox: {
    width: 112,
    height: 112,
    borderRadius: 30,
    overflow: 'hidden',
    backgroundColor: '#12A36F',
    shadowColor: '#064E3B',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 10,
  },
  lottie: {
    width: 112,
    height: 112,
  },
  loadingText: {
    marginTop: 16,
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
