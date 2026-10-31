import { get, post, put } from '../../../core/axios';
import { TResult } from '../../../core/types/TResult';

export interface Invitation {
    id: number;
    code: string;
    guestName: string;
    propertyId: number;
    createdById: number;
    validFrom: string;
    validUntil: string;
    status: 'PENDING_APPROVAL' | 'PENDING' | 'ENTERED' | 'EXITED' | 'EXPIRED' | 'CANCELLED';
    type: 'VISITOR' | 'PROVIDER';
    notes?: string;
    expectedPlate?: string | null;
    createdAt?: string;
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

/** Visitas sin cita que esperan autorización: las de mi casa (residente) o todas (jefe y admin). */
export const getPendingApprovals = async (): Promise<TResult<Invitation[]>> => {
    return await get<Invitation[]>('/invitations/pending-approvals');
};

/** Autoriza o rechaza una visita sin cita. El motivo es obligatorio al rechazar. */
export const decideApproval = async (id: number, decision: 'APPROVE' | 'REJECT', reason?: string): Promise<TResult<Invitation>> => {
    return await put<Invitation>(`/invitations/${id}/approval`, { decision, ...(reason ? { reason } : {}) });
};

/** Preferencia del residente: recibir avisos cuando sus visitas entran o salen. */
export const getVisitAlerts = async (): Promise<TResult<{ enabled: boolean }>> => {
    return await get<{ enabled: boolean }>('/invitations/visit-alerts');
};

export const setVisitAlerts = async (enabled: boolean): Promise<TResult<{ enabled: boolean }>> => {
    return await put<{ enabled: boolean }>('/invitations/visit-alerts', { enabled });
};
