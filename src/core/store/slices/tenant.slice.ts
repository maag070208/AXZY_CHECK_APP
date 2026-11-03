import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { ITenantState, TenantClient } from '../../tenant/tenant.types';

/**
 * Tenant (multicliente) de la APP. Solo aplica a ADMIN/MAINT de organización: eligen con qué
 * cliente de la organización operan; el `selectedClientId` viaja en el header `X-Client-Id`.
 * No se persiste con redux-persist: la selección vive en AsyncStorage por usuario
 * (`tenant.storage.ts`) y se limpia al cerrar sesión.
 */
const initialState: ITenantState = {
  clients: [],
  selectedClientId: null,
  status: 'idle',
};

export const tenantSlice = createSlice({
  name: 'tenant',
  initialState,
  reducers: {
    setTenantLoading: state => {
      state.status = 'loading';
    },
    setTenantClients: (state, action: PayloadAction<TenantClient[]>) => {
      state.clients = action.payload ?? [];
      state.status = 'ready';
    },
    setTenantError: state => {
      state.status = 'error';
    },
    selectClient: (state, action: PayloadAction<number | null>) => {
      state.selectedClientId = action.payload ?? null;
    },
    clearTenant: () => initialState,
  },
});

export const {
  setTenantLoading,
  setTenantClients,
  setTenantError,
  selectClient,
  clearTenant,
} = tenantSlice.actions;

export default tenantSlice.reducer;
