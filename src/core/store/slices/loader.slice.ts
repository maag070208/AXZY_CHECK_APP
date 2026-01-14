import { createSlice } from '@reduxjs/toolkit';

export interface ILoaderState {
    loading: boolean;
}

const initialState: ILoaderState = {
    loading: false,
};

export const loaderSlice = createSlice({
    name: 'loader',
    initialState,
    reducers: {
        showLoader: (state, action) => {
            state.loading = action.payload;
        },
    },
});

export const { showLoader } = loaderSlice.actions;

export default loaderSlice.reducer;
