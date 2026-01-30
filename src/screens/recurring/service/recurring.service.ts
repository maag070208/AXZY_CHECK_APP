import { get, post, put, remove } from '../../../core/axios';

// Interfaces for better type safety
export interface ITaskCreate {
    description: string;
    reqPhoto: boolean;
}

export interface ILocationCreate {
    locationId: number;
    locationName?: string; // For UI display
    tasks: ITaskCreate[];
}

export interface IRecurringConfigCreate {
    title: string;
    locations: ILocationCreate[];
}

export const getRecurringList = async () => {
    const response = await get<any[]>('/recurring');
    return { success: true, data: response.data };
};

export const createRecurring = async (data: IRecurringConfigCreate) => {
    const response = await post('/recurring', data);
    return { success: true, data: response.data };
};

export const updateRecurring = async (id: number, data: IRecurringConfigCreate) => {
    const response = await put(`/recurring/${id}`, data);
    return { success: true, data: response.data };
};

export const toggleRecurringActive = async (id: number, active: boolean) => {
    const response = await put(`/recurring/${id}/toggle`, { active });
    return { success: true, data: response.data };
};

export const deleteRecurring = async (id: number) => {
    const response = await remove(`/recurring/${id}`);
    return { success: true, data: response.data };
};

export const assignGuardToConfig = async (configId: number, guardIds: number[]) => {
    const response = await post(`/recurring/${configId}/assign`, { guardIds });
    return { success: true, data: response.data };
};

export const getMyRecurringAssignments = async () => {
    const response = await get<any[]>('/recurring/my-list');
    return { success: true, data: response.data };
};
