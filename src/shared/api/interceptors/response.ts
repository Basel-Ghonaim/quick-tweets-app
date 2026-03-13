import type { AxiosInstance } from "axios";

export const responseInterceptor = (client: AxiosInstance) => {
  client.interceptors.response.use(
    (response) => response,
    (error: unknown) => Promise.reject(error),
  );
};
