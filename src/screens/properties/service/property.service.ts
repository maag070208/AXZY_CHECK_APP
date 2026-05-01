import { get, post, put, remove } from '../../../core/axios';

export interface Property {
    id: number;
    identifier: string;
    name: string;
    typeId?: number;
    type: { id: number; name: string; value: string };
    mainStreet: string;
    betweenStreets?: string;
    latitude?: number;
    longitude?: number;
    statusId?: number;
    status: { id: number; name: string; value: string };
    active: boolean;
}

export const getPropertiesList = async () => {
    return await get<Property[]>("/properties");
};

export const createProperty = async (data: any) => {
    return await post<Property>("/properties", data);
};

export const updateProperty = async (id: number, data: any) => {
    return await put<Property>(`/properties/${id}`, data);
};

export const deleteProperty = async (id: number) => {
    return await remove(`/properties/${id}`);
};

export const getPropertyById = async (id: number) => {
    return await get<Property>(`/properties/${id}`);
};

/**
 * Mirror of web datatable search but returning TResult for consistency in mobile
 */
export const getPaginatedProperties = async (params: any) => {
    return await post<any>("/properties/datatable", params);
};
