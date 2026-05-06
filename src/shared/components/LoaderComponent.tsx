import React, { useEffect } from 'react';
import { View, StyleSheet, Modal, Image } from 'react-native';
import { useTheme } from 'react-native-paper';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { useAppSelector } from '../../core/store/hooks'; 
import LogoSource from '../assets/logo.png';

interface LoaderComponentProps {
  visible?: boolean;
}

export const LoaderComponent = ({ visible }: LoaderComponentProps) => {
  const globalLoading = useAppSelector(state => state.loaderState.loading);
  const loading = visible ?? globalLoading;
  const theme = useTheme();

  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (loading) {
      scale.value = withRepeat(
        withTiming(1.05, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        -1, 
        true, 
      );

      rotation.value = withRepeat(
        withTiming(1, { duration: 2500, easing: Easing.linear }),
        -1, 
        false, 
      );
    } else {
      scale.value = withTiming(1);
      rotation.value = withTiming(0);
    }
  }, [loading]);

  const animatedContainerStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: interpolate(scale.value, [1, 1.05], [0.98, 1]), 
    };
  });

  const animatedLogoStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(rotation.value, [0, 1], [0, 360]);
    return {
      transform: [
        { perspective: 1000 }, 
        { rotateY: `${rotateY}deg` },
      ],
    };
  });

  if (!loading || !theme || !theme.colors) return null;

  return (
    <Modal transparent={true} visible={loading} animationType="fade">
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            animatedContainerStyle,
            { backgroundColor: '#FFFFFF' }, 
          ]}
        >
          <Animated.View style={[styles.logoWrapper, animatedLogoStyle]}>
            <Image
              source={LogoSource}
              style={styles.logo}
              resizeMode="contain"
            />
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)', 
  },
  container: {
    paddingVertical: 28,
    paddingHorizontal: 28,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 12,
  },
  logoWrapper: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
});
