import { configureStore, combineReducers } from '@reduxjs/toolkit';
import storage from '@react-native-async-storage/async-storage';
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

const rootReducer = combineReducers({
  userState: userReducer,
  loaderState: loaderReducer,
  toastState: toastReducer,
});

const persistConfig = {
  key: APP_SETTINGS.DB_KEY.toString(),
  storage,
  version: 1,
  blacklist: [
    'loaderState', // nunca debemos persistir loaders
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
