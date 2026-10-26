import { get, put } from "../axios";
import { TResult } from "../types/TResult";

export interface UserProfile {
  id: number;
  name: string;
  lastName?: string | null;
  username: string;
  photoUrl?: string | null;
  active?: boolean;
  createdAt?: string;
  shiftStart?: string | null;
  shiftEnd?: string | null;
  role?: { id: number; name: string; value?: string } | null;
  schedule?: { id: number; name: string; startTime: string; endTime: string } | null;
}

/** Perfil propio (cualquier rol) o de otro usuario si el rol tiene users.manage. */
export const getUserById = async (id: number): Promise<TResult<UserProfile>> => {
  return get(`/users/${id}`);
};

export const updateUserProfile = async (id: number, data: any): Promise<TResult<any>> => {
  return put(`/users/${id}`, data);
};

export const changePassword = async (id: number, data: any): Promise<TResult<any>> => {
  return put(`/users/${id}/password`, data);
};