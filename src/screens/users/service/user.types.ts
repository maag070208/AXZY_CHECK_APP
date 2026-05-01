import { UserRole } from "../../../core/types/IUser";


export interface CreateUserDTO {
    name: string;
    lastName: string;
    username: string;
    password?: string;
    roleId?: number;
    role?: any;
    scheduleId?: number;
}

export interface IUser {
    id: number;
    name: string;
    lastName: string;
    username: string;
    role: {
        id: number;
        name: string;
        value: string;
    };
    active: boolean;
    shiftStart?: string;
    shiftEnd?: string;
}
