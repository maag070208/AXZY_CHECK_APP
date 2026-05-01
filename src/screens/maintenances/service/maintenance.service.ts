import { get, post, put } from '../../../core/axios';

export const createMaintenance = async (data: {
    title: string;
    category?: string;
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
            category: data.category,
            categoryId: data.categoryId,
            typeId: data.typeId,
            description: data.description,
            media: data.media,
            latitude: data.latitude,
            longitude: data.longitude
        };

        const response = await post('/maintenance', payload);
        return response;

    } catch (error: any) {
        console.error('Create Maintenance Error', error);
        return { success: false, data: null, messages: [error.message || 'Error al crear el mantenimiento'] };
    }
};

export const getMaintenances = async (filters?: {
    startDate?: Date;
    endDate?: Date;
    guardId?: number;
    category?: string;
    title?: string;
}) => {
    try {
        let query = '/maintenance?';
        const params = [];
        if (filters?.startDate) params.push(`startDate=${filters.startDate.toISOString()}`);
        if (filters?.endDate) params.push(`endDate=${filters.endDate.toISOString()}`);
        if (filters?.guardId) params.push(`guardId=${filters.guardId}`);
        if (filters?.category) params.push(`category=${filters.category}`);
        if (filters?.title) params.push(`title=${filters.title}`);
        
        if (params.length > 0) {
            query += params.join('&');
        } else {
            query = '/maintenance';
        }

        const response = await get(query);
        return response;
    } catch (error: any) {
        return { success: false, data: null, messages: [error.message] };
    }
};

export const getPaginatedMaintenances = async (params: { page: number, limit: number, filters?: any }) => {
    try {
        const response = await post('/maintenance/datatable', params);
        return response;
    } catch (error: any) {
        return { success: false, data: null, messages: [error.message] };
    }
};

export const resolveMaintenance = async (id: number) => {
    try {
        const response = await put(`/maintenance/${id}/resolve`);
        return response;
    } catch (error: any) {
        return { success: false, data: null, messages: [error.message] };
    }
};

export const getPendingMaintenancesCount = async () => {
    try {
        const response = await get('/maintenance/pending-count');
        return response;
    } catch (error: any) {
        return { success: false, data: null, messages: [error.message] };
    }
};
