import { get, post, put } from '../../../core/axios';

export const createIncident = async (data: {
    title: string;
    category: string;
    description: string;
    media: any[];
}) => {
    try {
        // Media is already uploaded in IncidentReportScreen
        const payload = {
            title: data.title,
            category: data.category,
            description: data.description,
            media: data.media
        };

        const response = await post('/incidents', payload);
        return response;

    } catch (error: any) {
        console.error('Create Incident Error', error);
        return { success: false, data: null, messages: [error.message || 'Error al crear la incidencia'] };
    }
};

export const getIncidents = async (filters?: {
    startDate?: Date;
    endDate?: Date;
    guardId?: number;
    category?: string;
    title?: string;
}) => {
    try {
        let query = '/incidents?';
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

export const resolveIncident = async (id: number) => {
    try {
        const response = await put(`/incidents/${id}/resolve`);
        return response;
    } catch (error: any) {
        return { success: false, data: null, messages: [error.message] };
    }
};

export const getPendingIncidentsCount = async () => {
    try {
        const response = await get('/incidents/pending-count');
        return response;
    } catch (error: any) {
        return { success: false, data: null, messages: [error.message] };
    }
};
