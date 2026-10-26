import { launchImageLibrary } from 'react-native-image-picker';

/**
 * Abre la galería del teléfono y devuelve la URI de la foto elegida.
 * Devuelve null si el usuario cancela. Lanza error si el sistema no pudo abrir la galería.
 */
export const pickPhotoFromGallery = async (): Promise<string | null> => {
  const result = await launchImageLibrary({ mediaType: 'photo', selectionLimit: 1, quality: 0.9 });
  if (result.didCancel) return null;
  if (result.errorCode) throw new Error(result.errorMessage ?? 'No se pudo abrir la galería');
  return result.assets?.[0]?.uri ?? null;
};
