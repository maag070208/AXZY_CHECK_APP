import { get, post } from '../../../core/axios';

export type ShiftType = 'MATUTINO' | 'NOCTURNO';

export interface IShiftHandoverElementInput {
  guardId: number;
  entryTime: string;
  punctual: boolean;
  observations?: string;
}

export interface ICreateShiftHandoverInput {
  shiftType: ShiftType;
  handoverDate: string; // "YYYY-MM-DD"
  credentialsCount?: number;
  tarjetonesCount?: number;
  novedades?: string;
  checklistPhones: boolean;
  checklistTablet: boolean;
  checklistRadios: boolean;
  checklistKeys: boolean;
  checklistLogbook: boolean;
  checklistConsignas: boolean;
  reportedToAdmin: boolean;
  elements: IShiftHandoverElementInput[];
}

export interface IPendingShiftHandover {
  pending: boolean;
  shiftType: ShiftType | null;
  date: string;
}

/** @description Creates a shift-handover report with its per-guard elements. */
export const createShiftHandover = (data: ICreateShiftHandoverInput) => {
  return post<any>('/shift-handover', data);
};

/** @description Whether today's shift-handover report is due and missing. */
export const getPendingShiftHandover = () => {
  return get<IPendingShiftHandover>('/shift-handover/pending');
};

/** @description Paginated history (used by the list screen). */
export const getShiftHandoverList = (page = 1, limit = 20) => {
  return post<{ rows: any[]; total: number }>('/shift-handover/datatable', {
    page,
    limit,
    filters: {},
  });
};

/** @description Full detail of one report (checklist + elements). */
export const getShiftHandoverDetail = (id: number) => {
  return get<any>(`/shift-handover/${id}`);
};
