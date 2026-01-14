import { get } from '../../../core/axios';

export interface IKardexFilter {
    userId?: number;
    locationId?: number;
    startDate?: string;
    endDate?: string;
}

export interface IKardexEntry {
    id: number;
    userId: number;
    locationId: number;
    timestamp: string;
    latitude?: number;
    longitude?: number;
    notes?: string;
    media?: { type: 'IMAGE' | 'VIDEO', url: 'string', description?: string }[];
    user: {
        id: number;
        username: string;
        name: string;
        lastName?: string;
    };
    location: {
        id: number;
        name: string;
    };
}

export const getKardex = async (filters: IKardexFilter) => {
    let query = '';
    const params = [];
    if (filters.userId) params.push(`userId=${filters.userId}`);
    if (filters.locationId) params.push(`locationId=${filters.locationId}`);
    if (filters.startDate) params.push(`startDate=${filters.startDate}`);
    if (filters.endDate) params.push(`endDate=${filters.endDate}`);
    
    if (params.length > 0) {
        query = '?' + params.join('&');
    }

    const response = await get<IKardexEntry[]>(`/kardex${query}`);
    return response;
};

export const getUsers = async () => {
    const response = await get<any[]>('/users');
    return { success: true, data: response.data };
};

export const getKardexById = async (id: number) => {
    const response = await get<IKardexEntry>(`/kardex/${id}`);
    return { success: true, data: response.data }; // Match TResult structure or adapt
};
