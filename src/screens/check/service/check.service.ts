import { post, patch } from '../../../core/axios';

export const registerCheck = async (
  locationId: number,
  userId: number,
  notes?: string,
  media?: any[],
  latitude?: number,
  longitude?: number,
  assignmentId?: number,
  clientRef?: string,
  timestamp?: Date,
  roundId?: number,
): Promise<any> => {
  const response = await post('/kardex', {
    locationId,
    userId,
    notes,
    media,
    latitude,
    longitude,
    assignmentId,
    roundId,
    clientRef,
    timestamp: timestamp ? timestamp.toISOString() : undefined,
  });
  return response;
};

export const updateCheck = async (kardexId: number, notes?: string, media?: any[]): Promise<{ success: boolean; data: any }> => {
  const response = await patch(`/kardex/${kardexId}`, {
    notes,
    media,
  });
  return { success: true, data: response.data };
};
