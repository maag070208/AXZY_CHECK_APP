import { createSlice, PayloadAction } from '@reduxjs/toolkit';

/** @description Estado global de conectividad y sincronización offline. */
export interface SyncState {
  connected: boolean;
  isWifi: boolean;
  syncing: boolean;
  pending: number;
  errors: number;
  lastSyncedAt: string | null;
}

const initialState: SyncState = {
  connected: true,
  isWifi: false,
  syncing: false,
  pending: 0,
  errors: 0,
  lastSyncedAt: null,
};

const syncSlice = createSlice({
  name: 'sync',
  initialState,
  reducers: {
    setConnectivity: (
      state,
      action: PayloadAction<{ connected: boolean; isWifi: boolean }>,
    ) => {
      state.connected = action.payload.connected;
      state.isWifi = action.payload.isWifi;
    },
    setSyncing: (state, action: PayloadAction<boolean>) => {
      state.syncing = action.payload;
    },
    setCounts: (state, action: PayloadAction<{ pending: number; errors: number }>) => {
      state.pending = action.payload.pending;
      state.errors = action.payload.errors;
    },
    setLastSynced: (state, action: PayloadAction<string | null>) => {
      state.lastSyncedAt = action.payload;
    },
  },
});

export const { setConnectivity, setSyncing, setCounts, setLastSynced } = syncSlice.actions;

export default syncSlice.reducer;
