import { UserRole } from "../../../core/types/IUser";


export interface CreateUserDTO {
    name: string;
    lastName: string;
    username: string;
    password?: string;
    role: UserRole;
    shiftStart?: string;
    shiftEnd?: string;
}

export interface IUser {
    id: number;
    name: string;
    lastName: string;
    username: string;
    role: UserRole;
    active: boolean;
    shiftStart?: string;
    shiftEnd?: string;
}
