import { apiClient } from "./client";
import { attachTokenInterceptor, responseInterceptor } from "./interceptors";

export const authClient = apiClient;

const token = localStorage.getItem("token");
if (token) attachTokenInterceptor(authClient, token);
responseInterceptor(authClient);
