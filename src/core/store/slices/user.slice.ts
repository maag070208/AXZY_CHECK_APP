import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { jwtDecode } from 'jwt-decode';
import { IAuthToken } from '../../types/IUser';

export interface IUserState {
  id: string | null;
  username: string | null;

  fullName: string | null;
  role: string | null;
  token: string | null;
  isSignedIn: boolean;
  loggedInAt: string | null;
}

const initialState: IUserState = {
  id: null,
  username: null,

  fullName: null,
  role: null,
  token: null,
  isSignedIn: false,
  loggedInAt: null,
};

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    login: (state, action: PayloadAction<string | null>) => {
      if (!action.payload) return initialState;

      const decoded = jwtDecode<IAuthToken>(action.payload);

      state.id = String(decoded.id);
      state.username = decoded.username;
      state.username = decoded.username;
      state.fullName = `${decoded.name} ${decoded.lastName}`;
      state.role = decoded.role;

      state.isSignedIn = true;
      state.token = action.payload;
      state.loggedInAt = new Date().toISOString();
    },

    logout: () => initialState,

    updateProfile: (state, action: PayloadAction<{ name: string; lastName: string }>) => {
      state.fullName = `${action.payload.name} ${action.payload.lastName}`.trim();
    },
  },
});

export const { login, logout, updateProfile } = userSlice.actions;

export default userSlice.reducer;
