import { createSlice } from "@reduxjs/toolkit";

const authSlice = createSlice({
  name: "auth",
  initialState: {},
  reducers: {},
});

export const { reducer: authReducer } = authSlice;
export const authActions = authSlice.actions;
