import { get, post } from '../../../core/axios';

export interface ICreateUniformCheckInput {
  guardId: number;
  pantalon: boolean;
  botas: boolean;
  cinturon: boolean;
  camisa: boolean;
  pluma: boolean;
  gorra: boolean;
  unas: boolean;
  orejas: boolean;
  desodorante: boolean;
  afeitado: boolean;
  peinado: boolean;
  notes?: string;
}

/** @description Records a uniform/grooming checklist entry for a guard. */
export const createUniformCheck = (data: ICreateUniformCheckInput) => {
  return post<any>('/uniform', data);
};

/** @description History of checklist entries for one guard. */
export const getUniformChecksByGuard = (guardId: number) => {
  return get<any[]>(`/uniform/by-guard/${guardId}`);
};
