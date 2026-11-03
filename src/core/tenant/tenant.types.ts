/** Cliente de la organización que puede elegir un ADMIN/MAINT de organización multicliente. */
export interface TenantClient {
  id: number;
  organizationId: number;
  name: string;
  /** RESIDENTIAL | MAQUILA | PLAZA */
  type: string;
  active: boolean;
}

export type TenantStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface ITenantState {
  clients: TenantClient[];
  selectedClientId: number | null;
  status: TenantStatus;
}

/** Estados de la pantalla/hoja de selección de cliente. */
export type ClientPickerState = 'loading' | 'error' | 'empty' | 'list';
