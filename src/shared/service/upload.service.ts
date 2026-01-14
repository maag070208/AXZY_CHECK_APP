import { API_CONSTANTS } from '../../core/constants/API_CONSTANTS';
import { store } from '../../core/store/redux.config';

export const uploadFile = async (uri: string, type: 'video' | 'image'): Promise<{ success: boolean; url?: string; error?: string }> => {
  const formData = new FormData();
  const filename = uri.split('/').pop() || (type === 'video' ? 'video.mp4' : 'image.jpg');
  
  // Robust mime type detection
  let mimeType = type === 'video' ? 'video/mp4' : 'image/jpeg';
  if (filename.endsWith('.mov')) {
      mimeType = 'video/quicktime';
  } else if (filename.endsWith('.png')) {
      mimeType = 'image/png';
  }

  console.log('Starting upload (fetch)...', { uri, filename, mimeType });

  formData.append('file', {
    uri,
    name: filename,
    type: mimeType,
  } as any);

  try {
    const state = store.getState();
    const token = state.userState.token;
    
    // Use native fetch to avoid Axios header conflicts
    const response = await fetch(`${API_CONSTANTS.BASE_URL}/uploads`, {
        method: 'POST',
        body: formData,
        headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            // Do NOT set Content-Type here; let the browser/engine set it with the boundary
        }
    });

    const result = await response.json();
    console.log('Upload success (fetch):', result);

    if (result && result.url) {
       return { success: true, url: result.url };
    }
    // Check TResult format
    if (result && result.data && result.data.url) {
        return { success: true, url: result.data.url };
    }

    return { success: false, error: 'No URL returned from server: ' + JSON.stringify(result) };
  } catch (error: any) {
    console.error('Upload error details (fetch):', error);
    return { success: false, error: error.message || 'Upload failed' };
  }
};
