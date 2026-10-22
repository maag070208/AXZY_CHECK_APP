import React, { useEffect, useRef } from 'react';
import { Animated, StyleProp, ViewStyle } from 'react-native';

interface SkeletonProps {
  width?: number | string;
  height: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Bloque gris con pulso para estados de carga. Se usa en lugar de spinners que
 * bloquean la pantalla. Respeta la forma del contenido final.
 */
export const Skeleton = ({ width, height, radius = 10, style }: SkeletonProps) => {
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.45, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: '#E6EFE9', opacity },
        style,
      ]}
    />
  );
};

export default Skeleton;
