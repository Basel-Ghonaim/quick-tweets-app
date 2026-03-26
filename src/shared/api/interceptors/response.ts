import type { AxiosInstance } from "axios";
import { errorNormalizer } from "../../errors/errorNormalizer";
import { appStorage, STORAGE_KEYS } from "../../storage";

export const responseInterceptor = (client: AxiosInstance) => {
  client.interceptors.response.use(
    (response) => response,
    (error: unknown) => {
      const normalizedError = errorNormalizer(error);

      if (normalizedError.type === "unauthorized") {
        appStorage.remove(STORAGE_KEYS.TOKEN);
        appStorage.remove(STORAGE_KEYS.USER);
      }
      return Promise.reject(normalizedError);
    },
  );
};
