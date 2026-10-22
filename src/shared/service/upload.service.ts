import { getBaseUrl } from '../../core/axios';
import { store } from '../../core/store/redux.config';
import { Image, Video } from 'react-native-compressor';
import { Platform } from 'react-native';

export const uploadFile = async (uri: string, type: 'video' | 'image', locationName: string = 'unknown'): Promise<{ success: boolean; url?: string; error?: string }> => {
  let uploadUri = uri;

  try {
    console.log(`[Upload] Iniciando compresión: ${type}`, { uri });
    if (type === 'image') {
      const compressedUri = await Image.compress(uri, {
        compressionMethod: 'manual',
        maxWidth: 1024,
        quality: 0.8,
      });
      if (compressedUri) uploadUri = compressedUri;
    } else if (type === 'video') {
      const compressedUri = await Video.compress(uri, { compressionMethod: 'auto' });
      if (compressedUri) uploadUri = compressedUri;
    }
  } catch (error) {
    console.warn('[Upload] Compresión fallida, usando original', error);
  }

  // Formateo de URI para Android
  if (Platform.OS === 'android' && !uploadUri.startsWith('file://') && !uploadUri.startsWith('http')) {
    uploadUri = `file://${uploadUri}`;
  }

  const state = store.getState();
  const token = state.userState.token;
  const endpoint = `${getBaseUrl()}/uploads`;

  const buildFormData = (fileUri: string) => {
    const filename = fileUri.split('/').pop() || (type === 'video' ? 'video.mp4' : 'image.jpg');
    let mimeType = type === 'video' ? 'video/mp4' : 'image/jpeg';
    if (filename.toLowerCase().endsWith('.mov')) mimeType = 'video/quicktime';
    if (filename.toLowerCase().endsWith('.3gp')) mimeType = 'video/3gpp';
    if (filename.toLowerCase().endsWith('.png')) mimeType = 'image/png';

    const formData = new FormData();
    formData.append('location', locationName);
    formData.append('file', {
      uri: fileUri,
      name: filename,
      type: mimeType,
    } as any);
    return formData;
  };

  const uploadOnce = async (fileUri: string) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), type === 'video' ? 60000 : 30000);
    try {
      return await fetch(endpoint, {
        method: 'POST',
        body: buildFormData(fileUri),
        signal: controller.signal,
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
          Accept: 'application/json',
        },
      });
    } finally {
      clearTimeout(timeout);
    }
  };

  const normalizeUri = (value: string) =>
    Platform.OS === 'android' && !value.startsWith('file://') && !value.startsWith('http')
      ? `file://${value}`
      : value;

  const candidates = Array.from(new Set([normalizeUri(uploadUri), normalizeUri(uri)]));
  let lastError = 'Error de red';

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const candidate = candidates[Math.min(attempt, candidates.length - 1)];
    try {
      console.log(`[Upload] Intento ${attempt + 1}/3:`, endpoint);
      const response = await uploadOnce(candidate);
      const result = await response.json().catch(() => ({}));

      if (response.ok && (result.success || result.url || result.data?.url)) {
        return { success: true, url: result.url || result.data?.url };
      }

      lastError = result.message || `Error del servidor (${response.status})`;
      const retryable = response.status >= 500 || response.status === 408 || response.status === 429;
      if (!retryable) {
        console.warn('[Upload] Error del servidor:', lastError);
        return { success: false, error: lastError };
      }
    } catch (error: any) {
      lastError = error?.message || 'Network request failed';
      console.warn(`[Upload] Falló intento ${attempt + 1}:`, lastError);
    }

    if (attempt < 2) {
      await new Promise(resolve => setTimeout(resolve, 700 * (attempt + 1)));
    }
  }

  console.warn('[Upload] No se pudo subir después de 3 intentos:', lastError);
  return {
    success: false,
    error: 'No se pudo subir el archivo. Verifica tu conexión e inténtalo de nuevo.',
  };
};
