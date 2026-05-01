import { get } from "../../core/axios";

export const getCatalog = async (key: string) => {
    return await get<any[]>(`/catalog/${key}`);
};
