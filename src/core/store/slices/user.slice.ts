import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { jwtDecode } from 'jwt-decode';
import { IAuthToken } from '../../types/IUser';

export interface IUserState {
  id: string | null;
  username: string | null;

  fullName: string | null;
  role: string | null;
  lastRole: string | null;
  photoUrl: string | null;
  token: string | null;
  isSignedIn: boolean;
  loggedInAt: string | null;
  permissions: string[] | null;
  /** Alcance multicliente de la sesión (`GET /users/me`): cliente activo y organización. */
  clientId: number | null;
  organizationId: number | null;
}

const initialState: IUserState = {
  id: null,
  username: null,

  fullName: null,
  role: null,
  lastRole: null,
  photoUrl: null,
  token: null,
  isSignedIn: false,
  loggedInAt: null,
  permissions: null,
  clientId: null,
  organizationId: null,
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
      state.lastRole = decoded.role;
      state.photoUrl = decoded.photoUrl ?? null;

      state.isSignedIn = true;
      state.token = action.payload;
      state.loggedInAt = new Date().toISOString();
      state.permissions = null;
      // El alcance del cliente se hidrata con `GET /users/me` al entrar; no se hereda del usuario anterior.
      state.clientId = null;
      state.organizationId = null;
    },

    logout: state => ({ ...initialState, lastRole: state.role ?? state.lastRole }),

    setPermissions: (state, action: PayloadAction<string[]>) => {
      state.permissions = action.payload;
    },

    setClientScope: (
      state,
      action: PayloadAction<{ clientId: number | null; organizationId: number | null }>,
    ) => {
      state.clientId = action.payload.clientId ?? null;
      state.organizationId = action.payload.organizationId ?? null;
    },

    updateProfile: (state, action: PayloadAction<{ name: string; lastName: string }>) => {
      state.fullName = `${action.payload.name} ${action.payload.lastName}`.trim();
    },

    setPhotoUrl: (state, action: PayloadAction<string | null>) => {
      state.photoUrl = action.payload;
    },
  },
});

export const { login, logout, updateProfile, setPermissions, setPhotoUrl, setClientScope } =
  userSlice.actions;

export default userSlice.reducer;
