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

/** `GET /users/me`: perfil de la sesión + alcance de cliente/organización que resolvió el API. */
export interface UserMe {
  id: number;
  name: string;
  lastName?: string | null;
  username: string;
  role: string | null;
  photoUrl?: string | null;
  /** Cliente activo de la sesión (multicliente); `null` si el alcance no fija uno. */
  clientId: number | null;
  organizationId: number | null;
}

/** Perfil de la sesión con el alcance multicliente (fuente del cliente activo para chat realtime). */
export const getMe = async (): Promise<TResult<UserMe>> => {
  return get('/users/me');
};

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