import React from 'react';
import { ActivityIndicator, Modal, StyleSheet, View } from 'react-native';
import { useAppSelector } from '../../core/store/hooks';

export default function LoaderComponent() {
  const { loading } = useAppSelector(state => state.loaderState);

  return (
    <View style={{ flex: 1, position: 'absolute' }}>
      <Modal transparent={true} animationType="fade" visible={loading}>
        <View style={styles.centeredView}>
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  loaderBox: {
    width: 100,
    height: 100,
    backgroundColor: 'white',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
