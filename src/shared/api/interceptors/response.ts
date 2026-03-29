import type { AxiosInstance } from "axios";
import { errorNormalizer } from "../../errors"; // استخدام الـ Barrel File
import { appStorage, STORAGE_KEYS } from "../../storage";

export const responseInterceptor = (client: AxiosInstance) => {
  client.interceptors.response.use(
    (response) => response,
    (error: unknown) => {
      const normalizedError = errorNormalizer(error);

      // Prevent sensitive stack traces from leaking to the client in production
      if (typeof import.meta !== "undefined" && import.meta.env?.PROD) {
        delete normalizedError.stack;
      }

      if (normalizedError.type === "unauthorized") {
        appStorage.remove(STORAGE_KEYS.TOKEN);
        appStorage.remove(STORAGE_KEYS.USER);
      }

      return Promise.reject(normalizedError);
    },
  );
};
