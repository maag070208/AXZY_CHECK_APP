import { get } from '../../../core/axios';
import type { TenantClient } from '../../../core/tenant/tenant.types';

export type IClient = TenantClient;

/**
 * Clientes de la organización del alcance (multicliente). Requiere `client.view`;
 * ADMIN/MAINT de organización lo usan para elegir con qué cliente operan.
 */
export const getClients = () => get<IClient[]>('/clients');
