import { post, patch } from '../../../core/axios';

export const registerCheck = async (
  locationId: number,
  userId: number,
  notes?: string,
  media?: any[],
  latitude?: number,
  longitude?: number,
  assignmentId?: number,
  offline?: { clientRef?: string; roundId?: number; scannedAt?: string; offline?: boolean },
): Promise<{ success: boolean; data: any }> => {
  const response = await post('/kardex', {
    locationId,
    userId,
    notes,
    media,
    latitude,
    longitude,
    assignmentId,
    clientRef: offline?.clientRef,
    roundId: offline?.roundId,
    scannedAt: offline?.scannedAt,
  }, {
    headers: offline?.offline ? { 'X-Offline-Sync': 'true' } : undefined,
  });
  return { success: true, data: response.data };
};

export const updateCheck = async (kardexId: number, notes?: string, media?: any[]): Promise<{ success: boolean; data: any }> => {
  const response = await patch(`/kardex/${kardexId}`, {
    notes,
    media,
  });
  return { success: true, data: response.data };
};
