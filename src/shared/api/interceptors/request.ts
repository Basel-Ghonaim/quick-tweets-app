import type { AxiosInstance } from "axios";

export const attachTokenInterceptor = (
  client: AxiosInstance,
  token: string,
) => {
  client.interceptors.request.use((config) => {
    config.headers.Authorization = `Bearer ${token}`;
    return config;
  });
};
