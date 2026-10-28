import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { secureSessionStorage as storage } from './secureSessionStorage';
import {
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import { APP_SETTINGS } from '../constants/APP_SETTINGS';

import userReducer from './slices/user.slice';
import loaderReducer from './slices/loader.slice';
import toastReducer from './slices/toast.slice';
import environmentReducer from './slices/environment.slice';

const rootReducer = combineReducers({
  userState: userReducer,
  loaderState: loaderReducer,
  toastState: toastReducer,
  environmentState: environmentReducer,
});

const persistConfig = {
  key: APP_SETTINGS.DB_KEY.toString(),
  storage,
  version: 1,
  blacklist: [
    'loaderState', // nunca debemos persistir loaders
    'environmentState', // nunca persistir el ambiente; se lee de DEFAULT_ENVIRONMENT
  ],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
