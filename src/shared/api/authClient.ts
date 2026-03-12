import { apiClient } from "./client";
import { attachTokenInterceptor } from "./interceptors/request";
import { responseInterceptor } from "./interceptors/response";

export const authClient = apiClient;

const token = localStorage.getItem("token");
if (token) attachTokenInterceptor(authClient, token);
responseInterceptor(authClient);
