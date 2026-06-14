import { configureStore } from "@reduxjs/toolkit";
import { authReducer } from "../../modules/auth/store";
import { baseApi } from "../../shared/rtk-query/baseApi";
import { setupListeners } from "@reduxjs/toolkit/query/react";

export const reduxStore = configureStore({
  reducer: {
    auth: authReducer,
    [baseApi.reducerPath]: baseApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(baseApi.middleware),
});

setupListeners(reduxStore.dispatch);

export type RootState = ReturnType<typeof reduxStore.getState>;
export type AppDispatch = typeof reduxStore.dispatch;
