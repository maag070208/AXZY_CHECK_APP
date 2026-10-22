export type OfflineEntity = 'REPORT' | 'MEDIA' | 'ROUND' | 'CHECK';
export type OfflineOperation =
  | 'REPORT_CREATE'
  | 'MEDIA_UPLOAD'
  | 'ROUND_START'
  | 'ROUND_END'
  | 'CHECK_CREATE'
  | 'CHECK_UPDATE';

export type SyncStatus = 'QUEUED' | 'SYNCING' | 'SYNCED' | 'FAILED' | 'CONFLICT' | 'DEAD_LETTER';
export type ReportKind = 'INCIDENT' | 'MAINTENANCE' | 'CLUB';

export interface OutboxRow {
  id: string;
  entity_type: OfflineEntity;
  entity_client_id: string;
  operation: OfflineOperation;
  payload_json: string;
  depends_on: string | null;
  status: SyncStatus;
  attempts: number;
  next_attempt_at: number | null;
  last_error: string | null;
  created_at: number;
  updated_at: number;
}

export interface OfflineMediaInput {
  uri: string;
  type: 'photo' | 'video';
  url?: string;
}

export interface OfflineReportInput {
  kind: ReportKind;
  title: string;
  categoryId: number | null;
  typeId: number | null;
  description: string;
  latitude?: number;
  longitude?: number;
  media: OfflineMediaInput[];
}
