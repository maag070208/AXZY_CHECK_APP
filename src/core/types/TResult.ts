export interface TResult<T> {
    data: T | null;
    success: boolean;
    messages?: string[] | null;
    ex?: any | null;
}
