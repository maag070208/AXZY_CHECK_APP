import { get } from "../../core/axios";

export const getCatalog = async (key: string) => {
    return await get<any[]>(`/catalog/${key}`);
};

export interface CatalogTypeItem {
    id: number;
    name: string;
    value: string;
    type?: string;
    categoryId?: number;
}

export interface CatalogCategoryItem {
    id: number;
    name: string;
    value: string;
    type?: string;
}

/**
 * @description Obtiene los tipos de incidencia/mantenimiento filtrados por el
 * tipo de su categoría (INCIDENT | MAINTENANCE), igual que el WEB.
 * @param categoryType Tipo de categoría a considerar.
 * @returns Lista de tipos cuyas categorías son del tipo indicado.
 */
export const getTypesByCategoryType = async (
    categoryType: 'INCIDENT' | 'MAINTENANCE',
): Promise<CatalogTypeItem[]> => {
    let categories: CatalogCategoryItem[] = [];
    let types: CatalogTypeItem[] = [];

    try {
        const [categoriesRes, typesRes] = await Promise.all([
            getCatalog('incident_category'),
            getCatalog('incident_type'),
        ]);
        categories = categoriesRes.success
            ? (categoriesRes.data as CatalogCategoryItem[]) || []
            : [];
        types = typesRes.success
            ? (typesRes.data as CatalogTypeItem[]) || []
            : [];
    } catch (error) {
        // Sin conexión o error de red: no lanzar, devolver vacío para que la
        // pantalla use la caché offline.
        console.warn('[Catalog] Error al obtener catálogos:', error);
    }

    const allowedIds = new Set(
        categories.filter(c => c.type === categoryType).map(c => Number(c.id)),
    );
    return types.filter(t => allowedIds.has(Number(t.categoryId)));
};
