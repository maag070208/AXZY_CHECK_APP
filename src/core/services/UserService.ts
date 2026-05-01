import { get, put } from "../axios";
import { TResult } from "../types/TResult";

export const getUserById = async (id: number): Promise<TResult<any>> => {
  return get(`/users/${id}`);
};

export const updateUserProfile = async (id: number, data: any): Promise<TResult<any>> => {
  return put(`/users/${id}`, data);
};

export const changePassword = async (id: number, data: any): Promise<TResult<any>> => {
  return put(`/users/${id}/password`, data);
};