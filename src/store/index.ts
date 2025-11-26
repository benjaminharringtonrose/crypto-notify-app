import { combineReducers, configureStore } from "@reduxjs/toolkit";
import {
  persistReducer,
  persistStore,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { cryptoApi } from "@/store/cryptoApi";
import { smartApi } from "@/store/smartApi";

const persistConfig = {
  key: "root",
  storage: AsyncStorage,
  whitelist: [cryptoApi.reducerPath],
};

const rootReducer = combineReducers({
  [cryptoApi.reducerPath]: cryptoApi.reducer,
  [smartApi.reducerPath]: smartApi.reducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }).concat(cryptoApi.middleware, smartApi.middleware),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
