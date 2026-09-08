import { createSlice, PayloadAction } from '@reduxjs/toolkit';

/**
 * @description Cola offline para los 4 flujos del guardia (Ronda, Kardex/
 * escaneo, Incidencia, Mantenimiento, Casa Club). Vive en el store global,
 * que ya se persiste completo en AsyncStorage (redux.config.ts no la
 * excluye), así que sobrevive a que se cierre la app sin conexión.
 */

export type QueueActionType =
  | 'ROUND_START'
  | 'ROUND_END'
  | 'KARDEX_SCAN'
  | 'INCIDENT_CREATE'
  | 'MAINTENANCE_CREATE'
  | 'CLUB_CREATE';

export type QueueItemStatus = 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';

export interface QueueLocalMedia {
  id: string;
  uri: string;
  type: 'photo' | 'video';
}

export interface QueueUploadedMedia {
  type: 'IMAGE' | 'VIDEO';
  url: string;
}

export interface QueueItem {
  /** = clientRef enviado a la API para idempotencia. */
  id: string;
  type: QueueActionType;
  payload: Record<string, any>;
  status: QueueItemStatus;
  attempts: number;
  /** Hora en que el guardia hizo la acción en su dispositivo (no cuando sincronizó). */
  createdAt: string;
  error?: string | null;
  /** Evidencia aún no subida (offline). Se sube antes de crear el registro. */
  localMedia: QueueLocalMedia[];
  /** Evidencia ya subida a S3 pero pendiente de adjuntar (o de enviarse con el create). */
  uploadedMedia: QueueUploadedMedia[];
  /** clientRef de la ronda a la que pertenece (KARDEX_SCAN, ROUND_END). */
  roundClientRef?: string;
  /** Id numérico real ya asignado por el servidor, una vez sincronizado. */
  serverId?: number;
}

interface OfflineQueueState {
  items: Record<string, QueueItem>;
}

const initialState: OfflineQueueState = {
  items: {},
};

const offlineQueueSlice = createSlice({
  name: 'offlineQueueState',
  initialState,
  reducers: {
    enqueueItem: (state, action: PayloadAction<QueueItem>) => {
      state.items[action.payload.id] = action.payload;
    },
    setItemStatus: (
      state,
      action: PayloadAction<{ id: string; status: QueueItemStatus; error?: string | null }>,
    ) => {
      const item = state.items[action.payload.id];
      if (!item) return;
      item.status = action.payload.status;
      item.error = action.payload.error ?? null;
      if (action.payload.status === 'SYNCING') item.attempts += 1;
    },
    setItemServerId: (state, action: PayloadAction<{ id: string; serverId: number }>) => {
      const item = state.items[action.payload.id];
      if (!item) return;
      item.serverId = action.payload.serverId;
    },
    addUploadedMedia: (
      state,
      action: PayloadAction<{ id: string; localMediaId: string; media: QueueUploadedMedia }>,
    ) => {
      const item = state.items[action.payload.id];
      if (!item) return;
      item.localMedia = item.localMedia.filter(m => m.id !== action.payload.localMediaId);
      item.uploadedMedia.push(action.payload.media);
    },
    removeItem: (state, action: PayloadAction<string>) => {
      delete state.items[action.payload];
    },
    /**
     * @description Mezcla campos nuevos en el payload de un item ya
     * encolado (p.ej. las notas/checklist final que se agregan después del
     * borrador inicial de un checkpoint registrado offline).
     */
    updateItemPayload: (
      state,
      action: PayloadAction<{ id: string; patch: Record<string, any> }>,
    ) => {
      const item = state.items[action.payload.id];
      if (!item) return;
      item.payload = { ...item.payload, ...action.payload.patch };
    },
    /**
     * @description Agrega evidencia local a un item YA encolado (p.ej. el
     * guardia sigue tomando fotos de un checkpoint que se registró offline
     * como "borrador"). Distinto de `addUploadedMedia`, que es lo que usa
     * el sync manager una vez que una foto local ya se subió.
     */
    appendLocalMedia: (
      state,
      action: PayloadAction<{ id: string; media: QueueLocalMedia }>,
    ) => {
      const item = state.items[action.payload.id];
      if (!item) return;
      item.localMedia.push(action.payload.media);
      // Si ya se había marcado FAILED/SYNCED, nueva evidencia lo vuelve a
      // dejar pendiente de sincronizar.
      if (item.status !== 'PENDING' && item.status !== 'SYNCING') {
        item.status = 'PENDING';
      }
    },
    /** Limpia registros ya sincronizados (se llama tras un ciclo de sync exitoso). */
    pruneSynced: state => {
      Object.keys(state.items).forEach(id => {
        if (state.items[id].status === 'SYNCED') delete state.items[id];
      });
    },
  },
});

export const {
  enqueueItem,
  setItemStatus,
  setItemServerId,
  addUploadedMedia,
  appendLocalMedia,
  updateItemPayload,
  removeItem,
  pruneSynced,
} = offlineQueueSlice.actions;

export default offlineQueueSlice.reducer;
