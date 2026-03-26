import type { AxiosInstance } from "axios";
import { appStorage, STORAGE_KEYS } from "../../storage";

export const attachTokenInterceptor = (client: AxiosInstance) => {
  client.interceptors.request.use((config) => {
    const token = appStorage.get<string>(STORAGE_KEYS.TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });
};