import React from 'react';
import { Image, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Blobatar } from '@blobatar/react-native';

interface UserAvatarProps {
  name?: string | null;
  photoUrl?: string | null;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Avatar de usuario: foto si existe; si no, Blobatar determinista.
 * El mismo nombre siempre genera el mismo blobatar.
 */
export const UserAvatar = ({ name, photoUrl, size = 42, style }: UserAvatarProps) => {
  const seed = (name ?? '').trim() || 'CheckApp';

  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: size / 2 }, style]}>
      {photoUrl ? (
        <Image source={{ uri: photoUrl }} style={styles.image} accessibilityLabel={`Foto de ${seed}`} />
      ) : (
        <Blobatar name={seed} size={size} background="circle" title={seed} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%' },
});
