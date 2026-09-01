import { get, post, put } from '../../../core/axios';

export const createClub = async (data: {
    title: string;
    categoryId?: number;
    typeId?: number;
    description: string;
    media: any[];
    latitude?: number;
    longitude?: number;
}) => {
    try {
        const payload = {
            title: data.title,
            categoryId: data.categoryId,
            typeId: data.typeId,
            description: data.description,
            media: data.media,
            latitude: data.latitude,
            longitude: data.longitude
        };

        const response = await post('/club', payload);
        return response;

    } catch (error: any) {
        console.error('Create Club Error', error);
        return { success: false, data: null, messages: [error.message || 'Error al crear el reporte de Casa Club'] };
    }
};

export const getClubs = async (filters?: {
    startDate?: Date;
    endDate?: Date;
    guardId?: number;
    category?: string;
    title?: string;
}) => {
    try {
        let query = '/club?';
        const params: string[] = [];
        if (filters?.startDate) params.push(`startDate=${filters.startDate.toISOString()}`);
        if (filters?.endDate) params.push(`endDate=${filters.endDate.toISOString()}`);
        if (filters?.guardId) params.push(`guardId=${filters.guardId}`);
        if (filters?.category) params.push(`category=${filters.category}`);
        if (filters?.title) params.push(`title=${filters.title}`);

        if (params.length > 0) {
            query += params.join('&');
        } else {
            query = '/club';
        }

        const response = await get(query);
        return response;
    } catch (error: any) {
        return { success: false, data: null, messages: [error.message] };
    }
};

export const getPaginatedClubs = async (params: { page: number, limit: number, filters?: any }) => {
    try {
        const response = await post('/club/datatable', params);
        return response;
    } catch (error: any) {
        return { success: false, data: null, messages: [error.message] };
    }
};

export const resolveClub = async (id: number) => {
    try {
        const response = await put(`/club/${id}/resolve`);
        return response;
    } catch (error: any) {
        return { success: false, data: null, messages: [error.message] };
    }
};

export const getPendingClubsCount = async () => {
    try {
        const response = await get('/club/pending-count');
        return response;
    } catch (error: any) {
        return { success: false, data: null, messages: [error.message] };
    }
};
