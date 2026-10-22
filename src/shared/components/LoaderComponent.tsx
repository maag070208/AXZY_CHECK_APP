import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useAppSelector } from '../../core/store/hooks';

/**
 * Indicador global NO bloqueante: una barra delgada en la parte superior.
 * El contenido sigue visible e interactivo; los skeletons viven en cada
 * pantalla según su forma.
 */
export default function LoaderComponent() {
  const { loading } = useAppSelector(state => state.loaderState);
  const { width } = useWindowDimensions();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!loading) {
      progress.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 1100,
        useNativeDriver: true,
      }),
    );
    progress.setValue(0);
    loop.start();
    return () => loop.stop();
  }, [loading, progress]);

  if (!loading) return null;

  return (
    <View pointerEvents="none" style={styles.track}>
      <Animated.View
        style={[
          styles.bar,
          {
            width: width * 0.38,
            transform: [
              {
                translateX: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-width * 0.4, width],
                }),
              },
            ],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    overflow: 'hidden',
    zIndex: 9999,
    elevation: 9999,
  },
  bar: {
    height: 3,
    borderRadius: 2,
    backgroundColor: '#12A36F',
  },
});
