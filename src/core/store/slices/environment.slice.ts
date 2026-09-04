import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  DEFAULT_ENVIRONMENT,
  Environment,
} from '../../constants/API_CONSTANTS';

export interface IEnvironmentState {
  environment: Environment;
}

const initialState: IEnvironmentState = {
  environment: DEFAULT_ENVIRONMENT,
};

export const environmentSlice = createSlice({
  name: 'environment',
  initialState,
  reducers: {
    setEnvironment: (state, action: PayloadAction<Environment>) => {
      state.environment = action.payload;
    },
  },
});

export const { setEnvironment } = environmentSlice.actions;

export default environmentSlice.reducer;
