import { API_CONSTANTS } from '../../core/constants/API_CONSTANTS';
import { store } from '../../core/store/redux.config';
import { Image, Video } from 'react-native-compressor';

export const uploadFile = async (uri: string, type: 'video' | 'image', locationName: string = 'unknown'): Promise<{ success: boolean; url?: string; error?: string }> => {
  let uploadUri = uri;

  try {
    console.log(`Starting compression for ${type}...`, { originalUri: uri });
    if (type === 'image') {
      const compressedUri = await Image.compress(uri, {
        compressionMethod: 'manual',
        maxWidth: 1024,
        quality: 0.8,
      });
      uploadUri = compressedUri;
    } else if (type === 'video') {
      const compressedUri = await Video.compress(uri, {
        compressionMethod: 'auto',
      });
      uploadUri = compressedUri;
    }
    console.log('Compression successful', { originalUri: uri, compressedUri: uploadUri });
  } catch (error) {
    console.warn('Compression failed, falling back to original file', error);
  }

  const formData = new FormData();
  const filename = uploadUri.split('/').pop() || (type === 'video' ? 'video.mp4' : 'image.jpg');
  
  // Robust mime type detection
  let mimeType = type === 'video' ? 'video/mp4' : 'image/jpeg';
  if (filename.endsWith('.mov')) {
      mimeType = 'video/quicktime';
  } else if (filename.endsWith('.png')) {
      mimeType = 'image/png';
  }

  console.log('Starting upload (fetch)...', { uri: uploadUri, filename, mimeType, locationName });

  formData.append('location', locationName);
  formData.append('file', {
    uri: uploadUri,
    name: filename,
    type: mimeType,
  } as any);

  const MAX_RETRIES = 3;
  let attempt = 0;
  
  while (attempt < MAX_RETRIES) {
      try {
        const state = store.getState();
        const token = state.userState.token;
        
        const response = await fetch(`${API_CONSTANTS.BASE_URL}/uploads`, {
            method: 'POST',
            body: formData,
            headers: {
                'Authorization': token ? `Bearer ${token}` : '',
                'Accept': 'application/json',
            }
        });

        const result = await response.json();
        console.log(`Upload attempt ${attempt + 1} result:`, result);

        if (response.ok && (result.url || result?.data?.url)) {
           return { success: true, url: result.url || result.data.url };
        }
        
        // If server returned error, don't retry unless 500?
        // Actually, let's treat non-200 as reason to retry if status is 5xx or network err
        if (response.status >= 500) {
            throw new Error(`Server Error ${response.status}`);
        }
        
        return { success: false, error: result.message || 'Upload failed' };

      } catch (error: any) {
        attempt++;
        console.error(`Upload attempt ${attempt} failed:`, error.message);
        
        if (attempt >= MAX_RETRIES) {
            return { success: false, error: 'Network request failed after multiple attempts.' };
        }
        
        // Wait before retrying (1s, 2s, etc)
        await new Promise(resolve => setTimeout(resolve, attempt * 1000));
      }
  }

  return { success: false, error: 'Upload failed' };
};
