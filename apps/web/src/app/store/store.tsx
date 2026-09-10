import { configureStore } from "@reduxjs/toolkit";
import { sessionReducer, authenticationReducer } from "@modules/auth";
import { baseApi } from "@shared/rtk-query";
import { setupListeners } from "@reduxjs/toolkit/query/react";

export const reduxStore = configureStore({
  reducer: {
    session: sessionReducer,
    authentication: authenticationReducer,
    [baseApi.reducerPath]: baseApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(baseApi.middleware),
});

setupListeners(reduxStore.dispatch);

export type RootState = ReturnType<typeof reduxStore.getState>;
export type AppDispatch = typeof reduxStore.dispatch;
