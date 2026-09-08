import { get, post, put } from '../../../core/axios';
import { enqueueOrRun } from '../../../core/services/syncManager';

export const createMaintenance = async (data: {
    title: string;
    categoryId?: number;
    typeId?: number;
    category?: string;
    description: string;
    media: any[];
    queuedMedia?: { uri: string; type: 'photo' | 'video' }[];
    latitude?: number;
    longitude?: number;
}) => {
    try {
        const payload = {
            title: data.title,
            categoryId: data.categoryId,
            typeId: data.typeId,
            category: data.category,
            description: data.description,
            media: data.media,
            latitude: data.latitude,
            longitude: data.longitude,
        };

        const localMedia = (data.queuedMedia || []).map((m, i) => ({
            id: `${Date.now()}-${i}`,
            uri: m.uri,
            type: m.type,
        }));

        const result = await enqueueOrRun('MAINTENANCE_CREATE', payload, { localMedia });
        return {
            success: true,
            data: result.data,
            messages: result.queued
                ? ['Reporte guardado. Se sincronizará cuando haya conexión.']
                : undefined,
        };
    } catch (error: any) {
        console.error('createMaintenance Error', error);
        return { success: false, data: null, messages: [error.message || 'Error al crear el reporte'] };
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
        
        const response = await get(query + params.join('&'));
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
