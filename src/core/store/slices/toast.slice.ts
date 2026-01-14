import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ToastType } from 'react-native-toast-message';

export type ToastState = {
    toast: {
        type: ToastType;
        message: string;
        hideMillis: number
    } | null;
};

const initialState: ToastState = {
    toast: null,
};

const toastSlice = createSlice({
    name: 'toast_slice',
    initialState,
    reducers: {
        showToast: (
            state,
            action: PayloadAction<{ type: ToastType; message: string, hideMillis?: number}>
        ) => {
            state.toast = {
                type: action.payload.type,
                message: action.payload.message,
                hideMillis: action.payload.hideMillis ?? 1000
            };
        },
        hideToast: (state) => {
            state.toast = null;
        },
    },
});

export const { showToast, hideToast } = toastSlice.actions;
export default toastSlice.reducer;
