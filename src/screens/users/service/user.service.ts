
import { get, post, put } from "../../../core/axios";
import { TResult } from "../../../core/types/TResult";
import { CreateUserDTO, IUser } from "./user.types";

export const getAllUsers = async (search?: string): Promise<TResult<IUser[]>> => {
    let query = '';
    if (search) query = `?q=${search}`;
    return await get<IUser[]>(`/users${query}`);
};

export const createUser = async (data: CreateUserDTO): Promise<TResult<IUser>> => {
    return await post<IUser>('/users', data);
};

export const updateUser = async (id: number, data: Partial<CreateUserDTO>): Promise<TResult<IUser>> => {
    return await put<IUser>(`/users/${id}`, data);
};
