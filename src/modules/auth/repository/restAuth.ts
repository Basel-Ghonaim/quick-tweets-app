import type { AuthRepository } from "./AuthRepository";
import { apiClient } from "../../../shared/api";
import { authMapper } from "../mapper";

export const restAuth = (): AuthRepository => {
  const { toAuthResponse } = authMapper();

  return {
    login: async (credintials) => {
      const res = await apiClient.post("/login", credintials);
      return toAuthResponse(res.data);
    },
  };
};
