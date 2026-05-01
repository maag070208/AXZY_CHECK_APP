import { get, post, put, remove } from '../../../core/axios';

export interface ResidentProfile {
    id: number;
    userId: number;
    firstName?: string;
    fatherLastName?: string;
    motherLastName?: string;
    phoneNumber?: string;
    email?: string;
    ineFrontUrl?: string;
    ineBackUrl?: string;
    emergencyContact?: string;
    emergencyPhone?: string;
}

export interface ResidentUser {
    id: number;
    name: string;
    lastName?: string;
    username: string;
    role: string;
    propertyId?: number;
    property?: { id: number; identifier: string; name: string };
    residentProfile?: ResidentProfile;
}

export const getPaginatedResidents = async (params: any) => {
    return await post<any>('/residents/datatable', params);
};

export const getResidentById = async (id: number) => {
    return await get<ResidentUser>(`/residents/${id}`);
};

export const createResident = async (data: any) => {
    return await post<ResidentUser>('/residents', data);
};

export const updateResident = async (id: number, data: any) => {
    return await put<ResidentUser>(`/residents/${id}`, data);
};

export const deleteResident = async (id: number) => {
    return await remove(`/residents/${id}`);
};

// Resident Contacts (Agenda)
export interface ResidentContact {
    id: number;
    residentId: number;
    name: string;
    phone?: string;
    email?: string;
    relationship?: string;
}

export const getResidentContacts = async (residentId: number) => {
    return await get<ResidentContact[]>(`/residents/${residentId}/contacts`);
};

export const createResidentContact = async (residentId: number, data: any) => {
    return await post<ResidentContact>(`/residents/${residentId}/contacts`, data);
};

export const updateResidentContact = async (residentId: number, contactId: number, data: any) => {
    return await put<ResidentContact>(`/residents/contacts/${contactId}`, data);
};

export const deleteResidentContact = async (residentId: number, contactId: number) => {
    return await remove(`/residents/contacts/${contactId}`);
};

export interface ResidentRelationship {
    id: number;
    name: string;
}

export const getResidentRelationships = async () => {
    return await get<ResidentRelationship[]>('/residents/catalog/relationships');
};
