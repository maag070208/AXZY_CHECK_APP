import { post, put } from '../../../core/axios';
import { TResult } from '../../../core/types/TResult';

export interface Invitation {
    id: number;
    code: string;
    guestName: string;
    propertyId: number;
    createdById: number;
    validFrom: string;
    validUntil: string;
    status: 'PENDING' | 'ENTERED' | 'EXITED' | 'EXPIRED' | 'CANCELLED';
    type: 'VISITOR' | 'PROVIDER';
    notes?: string;
    entryTime?: string;
    exitTime?: string;
    property?: { id: number, identifier: string, name: string };
    createdBy?: { id: number, name: string, lastName: string };
}

export const getPaginatedInvitations = async (params: any) => {
    // Mirror of web datatable search
    return await post<any>('/invitations/datatable', params);
};

export const createInvitation = async (data: any) => {
    return await post<Invitation>('/invitations', data);
};

export const updateInvitationStatus = async (id: number, status: string): Promise<TResult<Invitation>> => {
    try {
        return await put<Invitation>(`/invitations/${id}/status`, { status });
    } catch (error: any) {
        return {
            success: false,
            data: null,
            messages: error?.messages ?? ['No se pudo actualizar el pase'],
            ex: error,
        };
    }
};

export const getInvitationByCode = async (code: string) => {
    return await post<any>('/invitations/datatable', {
        page: 1,
        perPage: 1,
        filters: { code }
    });
};
