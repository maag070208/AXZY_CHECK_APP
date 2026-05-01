import { get, post, patch } from '../../../core/axios';
import { TResult } from '../../../core/types/TResult';
import {
  CreateAssignmentDTO,
  IAssignment,
  AssignmentStatus,
} from './assignment.types';

export const getMyAssignments = async (
  guardId?: string,
): Promise<TResult<IAssignment[]>> => {
  let query = '';
  const queryParams = [];
  if (guardId) queryParams.push(`guardId=${guardId}`);
  if (queryParams.length) query = '?' + queryParams.join('&');

  return await get<IAssignment[]>(`/assignments/me${query}`);
};

export const createAssignment = async (
  data: CreateAssignmentDTO,
): Promise<TResult<IAssignment>> => {
  return await post<IAssignment>('/assignments', data);
};

export const getAllAssignments = async (
  filters: { guardId?: number; status?: AssignmentStatus; id?: number } = {}
): Promise<TResult<IAssignment[]>> => {
  let query = '';
  const queryParams = [];
  if (filters.id) queryParams.push(`id=${filters.id}`);
  if (filters.guardId) queryParams.push(`guardId=${filters.guardId}`);
  if (filters.status) queryParams.push(`status=${filters.status}`);
  if (queryParams.length) query = '?' + queryParams.join('&');

  return await get<IAssignment[]>(`/assignments${query}`);
};

export const updateAssignmentStatus = async (
  id: number,
  status: AssignmentStatus,
): Promise<TResult<IAssignment>> => {
  return await patch<IAssignment>(`/assignments/${id}/status`, { status });
};

export const toggleTask = async (taskId: number): Promise<TResult<any>> => {
    return await patch<any>(`/assignments/tasks/${taskId}/toggle`, {});
};
